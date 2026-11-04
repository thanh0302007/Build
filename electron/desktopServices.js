// ============================================================
// CozySpace Desktop Services (electron/desktopServices.js)
// - Lưu trữ bền vững trên ổ cứng máy tính (db.json + media/ + backups/)
// - Giao thức nội bộ `cozy-media://local/<file>` tốc độ cao, không giới hạn 5MB
// - Sao lưu tự động hằng ngày, Xuất/Nhập gói dữ liệu đầy đủ, Đổi thư mục lưu trữ
// - Lưu trạng thái cửa sổ (window-state.json) & Khay hệ thống (System Tray)
// ============================================================
import { app, dialog, ipcMain, Menu, nativeImage, net, Notification, protocol, shell, Tray } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MIME_BY_EXT = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
};

const EXT_BY_MIME = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
};

let dataDirCache = null;
let dbCache = { version: 2, updatedAt: Date.now(), keys: {} };
let flushTimer = null;
let trayInstance = null;
let trayBalloonShown = false;

const todayStamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function getConfigPath() {
  return path.join(app.getPath('userData'), 'storage-config.json');
}

function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

export function getDataDir() {
  if (dataDirCache) return dataDirCache;
  const fallback = path.join(app.getPath('userData'), 'CozySpaceData');
  try {
    const cfgPath = getConfigPath();
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg?.dataDir && typeof cfg.dataDir === 'string') {
        fs.mkdirSync(cfg.dataDir, { recursive: true });
        dataDirCache = cfg.dataDir;
        ensureSubDirs(dataDirCache);
        return dataDirCache;
      }
    }
  } catch {
    /* dùng đường dẫn mặc định */
  }
  fs.mkdirSync(fallback, { recursive: true });
  dataDirCache = fallback;
  ensureSubDirs(dataDirCache);
  return dataDirCache;
}

function ensureSubDirs(baseDir) {
  fs.mkdirSync(path.join(baseDir, 'media'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'backups'), { recursive: true });
}

export function getMediaDir() {
  return path.join(getDataDir(), 'media');
}

export function getBackupsDir() {
  return path.join(getDataDir(), 'backups');
}

function getDbPath() {
  return path.join(getDataDir(), 'db.json');
}

/** Đăng ký giao thức `cozy-media://` trước khi `app.whenReady()` */
export function registerCozyMediaScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'cozy-media',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        bypassCSP: true,
      },
    },
  ]);
}

/** Gắn bộ xử lý đọc file ảnh/tài liệu trực tiếp từ ổ cứng */
export function attachCozyMediaProtocol() {
  protocol.handle('cozy-media', async (request) => {
    try {
      const u = new URL(request.url);
      const rawName = decodeURIComponent(u.pathname || '').replace(/^\/+/, '');
      const safeName = path.basename(rawName);
      if (!safeName) return new Response('Not found', { status: 404 });

      const fullPath = path.join(getMediaDir(), safeName);
      if (!fs.existsSync(fullPath)) {
        return new Response('File not found', { status: 404 });
      }
      try {
        return await net.fetch(pathToFileURL(fullPath).toString());
      } catch {
        const buf = fs.readFileSync(fullPath);
        const ext = path.extname(safeName).toLowerCase();
        return new Response(buf, {
          status: 200,
          headers: {
            'Content-Type': MIME_BY_EXT[ext] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (err) {
      return new Response(String(err), { status: 500 });
    }
  });
}

/** Lưu 1 chuỗi DataURL (Base64 hoặc UTF-8 SVG) thành file thật trong `media/` */
export function saveDataUrlToMedia(dataUrl, prefix = 'media') {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl;

  const header = dataUrl.slice(5, commaIdx); // vd: image/webp;base64
  const body = dataUrl.slice(commaIdx + 1);
  const isBase64 = /;base64/i.test(header);
  const mime = header.split(';')[0].trim().toLowerCase() || 'image/png';
  const ext = EXT_BY_MIME[mime] || 'bin';

  const buffer = isBase64
    ? Buffer.from(body, 'base64')
    : Buffer.from(decodeURIComponent(body), 'utf8');

  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 14);
  const cleanPrefix = String(prefix || 'media').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'media';
  const filename = `${cleanPrefix}-${hash}.${ext}`;
  const fullPath = path.join(getMediaDir(), filename);

  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, buffer);
  }
  return `cozy-media://local/${filename}`;
}

/** Tự động tách mọi ảnh Base64 lớn nằm trong JSON sang file thật trên đĩa */
function extractDataUrlsDeep(value, hint = 'img') {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') && value.length > 512) {
      try {
        return saveDataUrlToMedia(value, hint);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => extractDataUrlsDeep(item, hint));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = extractDataUrlsDeep(v, k);
    }
    return out;
  }
  return value;
}

/** Đọc cơ sở dữ liệu từ ổ cứng (có khôi phục tự động nếu file chính bị lỗi) */
export function loadDatabaseSync() {
  const dbPath = getDbPath();
  const bakPath = `${dbPath}.bak`;

  const tryRead = (p) => {
    if (!fs.existsSync(p)) return null;
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        const keys = parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : parsed;
        return { version: 2, updatedAt: parsed.updatedAt || Date.now(), keys };
      }
    } catch {
      return null;
    }
    return null;
  };

  const loaded = tryRead(dbPath) || tryRead(bakPath);
  if (loaded) {
    dbCache = loaded;
  } else {
    dbCache = { version: 2, updatedAt: Date.now(), keys: {} };
  }
  ensureDailyBackup();
  return dbCache;
}

/** Ghi nguyên tử xuống ổ cứng (an toàn khi sập nguồn / OneDrive khóa file tạm thời) */
export function flushDatabaseSync() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    const dbPath = getDbPath();
    const tmpPath = `${dbPath}.tmp`;
    const bakPath = `${dbPath}.bak`;
    dbCache.updatedAt = Date.now();
    const content = JSON.stringify(dbCache, null, 2);

    fs.writeFileSync(tmpPath, content, 'utf8');
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, bakPath);
      } catch {
        /* bỏ qua lỗi phụ */
      }
    }
    try {
      fs.renameSync(tmpPath, dbPath);
    } catch {
      fs.writeFileSync(dbPath, content, 'utf8');
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
    return true;
  } catch (err) {
    console.error('[CozySpace] Không thể ghi db.json:', err);
    return false;
  }
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushDatabaseSync();
  }, 220);
}

/** Tự động tạo 1 bản sao lưu mỗi ngày (giữ tối đa 15 bản gần nhất) */
export function ensureDailyBackup(customPrefix = 'cozyspace-auto') {
  try {
    const keyCount = Object.keys(dbCache.keys || {}).length;
    if (keyCount === 0) return null;

    const backupsDir = getBackupsDir();
    const fileName = `${customPrefix}-${todayStamp()}.json`;
    const targetPath = path.join(backupsDir, fileName);

    if (!fs.existsSync(targetPath) || customPrefix !== 'cozyspace-auto') {
      const actualName =
        customPrefix === 'cozyspace-auto'
          ? fileName
          : `${customPrefix}-${todayStamp()}-${Date.now().toString(36)}.json`;
      const outPath = path.join(backupsDir, actualName);
      fs.writeFileSync(outPath, JSON.stringify(dbCache, null, 2), 'utf8');
    }

    // Dọn bớt các bản auto cũ, giữ 15 bản mới nhất
    const autoFiles = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('cozyspace-auto-') && f.endsWith('.json'))
      .sort()
      .reverse();

    autoFiles.slice(15).forEach((oldFile) => {
      try {
        fs.unlinkSync(path.join(backupsDir, oldFile));
      } catch {
        /* ignore */
      }
    });
    return targetPath;
  } catch {
    return null;
  }
}

function computeStorageInfo() {
  const dataDir = getDataDir();
  const dbPath = getDbPath();
  const mediaDir = getMediaDir();
  const backupsDir = getBackupsDir();

  let dbSizeBytes = 0;
  try {
    if (fs.existsSync(dbPath)) dbSizeBytes = fs.statSync(dbPath).size;
  } catch {
    /* ignore */
  }

  let mediaCount = 0;
  let mediaSizeBytes = 0;
  try {
    for (const f of fs.readdirSync(mediaDir)) {
      const st = fs.statSync(path.join(mediaDir, f));
      if (st.isFile()) {
        mediaCount += 1;
        mediaSizeBytes += st.size;
      }
    }
  } catch {
    /* ignore */
  }

  let backups = [];
  try {
    backups = fs
      .readdirSync(backupsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const st = fs.statSync(path.join(backupsDir, f));
        return {
          file: f,
          updatedAt: st.mtimeMs,
          sizeKB: Math.max(1, Math.round(st.size / 1024)),
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20);
  } catch {
    /* ignore */
  }

  return {
    dataDir,
    dbSizeKB: Math.round((dbSizeBytes / 1024) * 10) / 10,
    mediaCount,
    mediaSizeKB: Math.round(mediaSizeBytes / 1024),
    backups,
  };
}

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ============================================================
// QUẢN LÝ VỊ TRÍ & KÍCH THƯỚC CỬA SỔ
// ============================================================
export function loadWindowState() {
  const defaults = { width: 1420, height: 890, isMaximized: false };
  try {
    const p = getWindowStatePath();
    if (!fs.existsSync(p)) return defaults;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      width: Math.max(1024, Number(raw.width) || defaults.width),
      height: Math.max(680, Number(raw.height) || defaults.height),
      x: Number.isFinite(raw.x) ? raw.x : undefined,
      y: Number.isFinite(raw.y) ? raw.y : undefined,
      isMaximized: Boolean(raw.isMaximized),
    };
  } catch {
    return defaults;
  }
}

export function trackWindowState(win) {
  let saveTimer = null;
  const save = () => {
    if (!win || win.isDestroyed()) return;
    try {
      const isMaximized = win.isMaximized();
      const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
      fs.writeFileSync(
        getWindowStatePath(),
        JSON.stringify({ ...bounds, isMaximized }, null, 2),
        'utf8'
      );
    } catch {
      /* ignore */
    }
  };
  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 350);
  };
  win.on('resize', debouncedSave);
  win.on('move', debouncedSave);
  win.on('close', save);
}

// ============================================================
// KHAY HỆ THỐNG WINDOWS (SYSTEM TRAY)
// ============================================================
export function resolveAppIconPath(rootDir) {
  const unpackedRoot = rootDir.replace('app.asar', 'app.asar.unpacked');
  const candidates = [
    path.join(unpackedRoot, 'build', 'icon.ico'),
    path.join(unpackedRoot, 'build', 'icon.png'),
    path.join(rootDir, 'build', 'icon.ico'),
    path.join(rootDir, 'build', 'icon.png'),
    path.join(rootDir, 'dist', 'icon.png'),
    path.join(rootDir, 'public', 'icon.png'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) return undefined;
  if (!found.includes('app.asar' + path.sep)) return found;
  try {
    const img = nativeImage.createFromBuffer(fs.readFileSync(found));
    return img.isEmpty() ? found : img;
  } catch {
    return found;
  }
}

export function setupSystemTray(rootDir, getMainWindow, onQuitApp) {
  if (trayInstance) return trayInstance;
  const unpackedRoot = rootDir.replace('app.asar', 'app.asar.unpacked');
  const iconPath =
    [
      path.join(unpackedRoot, 'build', 'icon.ico'),
      path.join(unpackedRoot, 'build', 'tray.png'),
      path.join(unpackedRoot, 'build', 'icon.png'),
      path.join(rootDir, 'build', 'icon.ico'),
      path.join(rootDir, 'build', 'tray.png'),
      path.join(rootDir, 'build', 'icon.png'),
    ].find((p) => fs.existsSync(p)) || null;

  if (!iconPath) return null;

  try {
    const trayImg = !iconPath.includes('app.asar' + path.sep)
      ? nativeImage.createFromPath(iconPath)
      : nativeImage.createFromBuffer(fs.readFileSync(iconPath)).resize({ width: 16, height: 16 });
    trayInstance = new Tray(trayImg.isEmpty() ? iconPath : trayImg);
    trayInstance.setToolTip('CozySpace — Không gian học tập & sống chậm');

    const showMain = () => {
      const win = getMainWindow();
      if (!win || win.isDestroyed()) return;
      if (!win.isVisible()) win.show();
      if (win.isMinimized()) win.restore();
      win.focus();
    };

    const sendTrayAction = (action) => {
      const win = getMainWindow();
      if (!win || win.isDestroyed()) return;
      win.webContents.send('cozy:tray-action', action);
    };

    const contextMenu = Menu.buildFromTemplate([
      { label: '🌸 Mở CozySpace', click: showMain },
      { type: 'separator' },
      { label: '🍅 Bắt đầu / Tạm dừng Pomodoro', click: () => sendTrayAction('toggle-pomodoro') },
      { label: '🎶 Phát / Tạm dừng nhạc nền', click: () => sendTrayAction('toggle-music') },
      {
        label: '📂 Mở thư mục dữ liệu trên máy',
        click: () => shell.openPath(getDataDir()),
      },
      { type: 'separator' },
      {
        label: '🚪 Thoát hẳn CozySpace',
        click: () => {
          onQuitApp?.();
          app.quit();
        },
      },
    ]);

    trayInstance.setContextMenu(contextMenu);
    trayInstance.on('click', showMain);
    trayInstance.on('double-click', showMain);
    return trayInstance;
  } catch (err) {
    console.warn('[CozySpace] Không khởi tạo được System Tray:', err);
    return null;
  }
}

export function notifyMinimizedToTray() {
  if (trayBalloonShown) return;
  trayBalloonShown = true;
  try {
    if (Notification.isSupported()) {
      new Notification({
        title: 'CozySpace vẫn đang chạy nền 🌸',
        body: 'Đồng hồ Pomodoro và nhạc của bạn vẫn tiếp tục dưới khay hệ thống (góc phải màn hình).',
        silent: true,
      }).show();
    }
  } catch {
    /* ignore */
  }
}

// ============================================================
// ĐĂNG KÝ CÁC KÊNH IPC LƯU TRỮ & HỆ THỐNG
// ============================================================
export function registerStorageIpcHandlers(getMainWindow) {
  loadDatabaseSync();

  // Khởi tạo đồng bộ 1 lần duy nhất lúc mở app -> không bao giờ nháy màn hình
  ipcMain.on('cozy:db-init-sync', (event) => {
    event.returnValue = {
      dataDir: getDataDir(),
      keys: dbCache.keys || {},
    };
  });

  // Ghi 1 key vào bộ nhớ & lên lịch lưu xuống ổ cứng
  ipcMain.handle('cozy:db-write-key', async (_event, key, value) => {
    if (!key || typeof key !== 'string') return false;
    const normalized = extractDataUrlsDeep(value, key);
    dbCache.keys[key] = normalized;
    scheduleFlush();
    return { ok: true, normalizedChanged: normalized !== value, normalized };
  });

  // Nhập dữ liệu di chuyển từ localStorage cũ (lần đầu nâng cấp)
  ipcMain.handle('cozy:db-migrate-legacy', async (_event, legacyMap) => {
    if (!legacyMap || typeof legacyMap !== 'object') return { ok: false };
    let migrated = 0;
    for (const [k, v] of Object.entries(legacyMap)) {
      if (dbCache.keys[k] === undefined && v !== undefined) {
        dbCache.keys[k] = extractDataUrlsDeep(v, k);
        migrated += 1;
      }
    }
    if (migrated > 0) {
      flushDatabaseSync();
      ensureDailyBackup('cozyspace-migrated');
    }
    return { ok: true, migrated, keys: dbCache.keys };
  });

  ipcMain.handle('cozy:db-flush', async () => flushDatabaseSync());

  // Lưu file ảnh từ DataURL -> trả về `cozy-media://local/<filename>`
  ipcMain.handle('cozy:save-media-dataurl', async (_event, dataUrl, prefix) => {
    try {
      const url = saveDataUrlToMedia(dataUrl, prefix);
      return { ok: true, url };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('cozy:get-storage-info', async () => computeStorageInfo());

  ipcMain.handle('cozy:open-data-folder', async () => {
    const dir = getDataDir();
    await shell.openPath(dir);
    return { ok: true, dataDir: dir };
  });

  ipcMain.handle('cozy:create-manual-snapshot', async () => {
    flushDatabaseSync();
    ensureDailyBackup('cozyspace-snapshot');
    return { ok: true, info: computeStorageInfo() };
  });

  // Đổi thư mục lưu trữ dữ liệu sang ổ cứng/thư mục khác trên laptop
  ipcMain.handle('cozy:change-data-folder', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Chọn thư mục lưu dữ liệu CozySpace trên máy tính',
      buttonLabel: 'Chọn thư mục này',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || !res.filePaths?.[0]) return { canceled: true };

    const picked = res.filePaths[0];
    const targetDir =
      path.basename(picked).toLowerCase() === 'cozyspacedata'
        ? picked
        : path.join(picked, 'CozySpaceData');

    const oldDir = getDataDir();
    if (path.resolve(targetDir) === path.resolve(oldDir)) {
      return { ok: true, info: computeStorageInfo() };
    }

    flushDatabaseSync();
    ensureSubDirs(targetDir);

    // Nếu thư mục đích đã có db.json sẵn thì hỏi người dùng muốn dùng dữ liệu ở đó hay chép sang
    const targetDb = path.join(targetDir, 'db.json');
    let useExistingInTarget = false;
    if (fs.existsSync(targetDb)) {
      const ask = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['Dùng dữ liệu có sẵn trong thư mục mới', 'Chép dữ liệu hiện tại đè sang', 'Hủy'],
        defaultId: 0,
        cancelId: 2,
        title: 'Phát hiện dữ liệu CozySpace có sẵn',
        message: 'Thư mục bạn chọn đã có sẵn dữ liệu CozySpace.',
        detail: 'Bạn muốn nạp dữ liệu có sẵn trong thư mục đó hay chép dữ liệu hiện tại sang?',
      });
      if (ask.response === 2) return { canceled: true };
      useExistingInTarget = ask.response === 0;
    }

    if (!useExistingInTarget) {
      copyDirRecursive(oldDir, targetDir);
    }

    fs.writeFileSync(getConfigPath(), JSON.stringify({ dataDir: targetDir }, null, 2), 'utf8');
    dataDirCache = targetDir;
    loadDatabaseSync();

    return {
      ok: true,
      reloadedKeys: dbCache.keys,
      info: computeStorageInfo(),
    };
  });

  // Xuất toàn bộ dữ liệu + hình ảnh thành 1 file `.cozybackup.json` duy nhất
  ipcMain.handle('cozy:export-backup', async () => {
    const win = getMainWindow();
    flushDatabaseSync();
    const res = await dialog.showSaveDialog(win, {
      title: 'Xuất bản sao lưu CozySpace đầy đủ',
      defaultPath: `CozySpace-Backup-${todayStamp()}.cozybackup.json`,
      filters: [{ name: 'CozySpace Backup (*.json)', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePath) return { canceled: true };

    const mediaFiles = {};
    const mediaDir = getMediaDir();
    try {
      for (const f of fs.readdirSync(mediaDir)) {
        const full = path.join(mediaDir, f);
        if (fs.statSync(full).isFile()) {
          const ext = path.extname(f).toLowerCase();
          const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
          const b64 = fs.readFileSync(full).toString('base64');
          mediaFiles[f] = `data:${mime};base64,${b64}`;
        }
      }
    } catch {
      /* ignore */
    }

    const bundle = {
      format: 'cozyspace-backup-v2',
      exportedAt: new Date().toISOString(),
      keys: dbCache.keys,
      mediaFiles,
    };

    fs.writeFileSync(res.filePath, JSON.stringify(bundle, null, 2), 'utf8');
    return { ok: true, filePath: res.filePath };
  });

  // Nhập bản sao lưu `.json`
  ipcMain.handle('cozy:import-backup', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Chọn tệp sao lưu CozySpace (.json)',
      filters: [{ name: 'CozySpace Backup (*.json)', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (res.canceled || !res.filePaths?.[0]) return { canceled: true };

    try {
      const raw = JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'));
      const incomingKeys =
        raw?.format === 'cozyspace-backup-v2' && raw.keys
          ? raw.keys
          : raw?.keys && typeof raw.keys === 'object'
            ? raw.keys
            : raw;

      if (!incomingKeys || typeof incomingKeys !== 'object' || Array.isArray(incomingKeys)) {
        return { ok: false, error: 'Định dạng tệp sao lưu không hợp lệ.' };
      }

      // Lưu bản an toàn trước khi khôi phục
      ensureDailyBackup('cozyspace-before-restore');

      // Khôi phục các file ảnh đính kèm nếu có
      if (raw?.mediaFiles && typeof raw.mediaFiles === 'object') {
        const mediaDir = getMediaDir();
        for (const [fileName, dataUrl] of Object.entries(raw.mediaFiles)) {
          const safe = path.basename(fileName);
          const comma = String(dataUrl).indexOf(',');
          if (safe && comma !== -1) {
            const buf = Buffer.from(String(dataUrl).slice(comma + 1), 'base64');
            fs.writeFileSync(path.join(mediaDir, safe), buf);
          }
        }
      }

      dbCache.keys = extractDataUrlsDeep(incomingKeys, 'restored');
      flushDatabaseSync();

      return { ok: true, keys: dbCache.keys, info: computeStorageInfo() };
    } catch (err) {
      return { ok: false, error: err.message || 'Không đọc được tệp sao lưu.' };
    }
  });

  // Khôi phục từ 1 bản tự động trong thư mục `backups/`
  ipcMain.handle('cozy:restore-snapshot', async (_event, fileName) => {
    try {
      const safe = path.basename(String(fileName || ''));
      const fullPath = path.join(getBackupsDir(), safe);
      if (!safe || !fs.existsSync(fullPath)) {
        return { ok: false, error: 'Không tìm thấy bản sao lưu này.' };
      }
      const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const incomingKeys = parsed?.keys && typeof parsed.keys === 'object' ? parsed.keys : parsed;
      ensureDailyBackup('cozyspace-before-snapshot');
      dbCache.keys = incomingKeys;
      flushDatabaseSync();
      return { ok: true, keys: dbCache.keys, info: computeStorageInfo() };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
}
