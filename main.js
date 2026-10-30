// ============================================================
// CozySpace - Electron Main Process (main.js)
// Giải quyết triệt để lỗi "Couldn't sign you in - This browser or app may not be secure":
//   - Google chặn đăng nhập trực tiếp trong mọi BrowserWindow / <webview> của Electron.
//   - Khi người dùng bấm [🔑 Đăng nhập Google] (hoặc bấm Sign in trong Gemini),
//     CozySpace mở một cửa sổ Google Chrome / Microsoft Edge THẬT của hệ điều hành
//     (với thư mục hồ sơ riêng + cổng CDP nội bộ 127.0.0.1), chờ người dùng đăng nhập
//     Google thành công 100%, sau đó chép toàn bộ cookie phiên đăng nhập vào
//     `session.fromPartition('persist:gemini')` rồi tự reload <webview id="gemini-webview">!
// ============================================================
import { app, BrowserWindow, ipcMain, nativeTheme, session, shell } from 'electron';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { GEMINI_LIGHT_THEME_SCRIPT, GEMINI_PASTEL_CSS, isGeminiAppUrl } from './src/lib/geminiWebviewStyle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const PROD_PORT = 47821;
const DIST_DIR = path.join(__dirname, 'dist');

nativeTheme.themeSource = 'light';
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

const chromeVer = process.versions.chrome || '134.0.0.0';
const CHROME_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
app.userAgentFallback = CHROME_USER_AGENT;

let mainWindow = null;
let activeAuthFlow = null;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
        let filePath = path.normalize(path.join(DIST_DIR, urlPath));
        if (!filePath.startsWith(DIST_DIR)) {
          res.writeHead(403);
          return res.end();
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(DIST_DIR, 'index.html');
        }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        });
        fs.createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
    server.once('error', reject);
    server.listen(PROD_PORT, '127.0.0.1', () => resolve(`http://127.0.0.1:${PROD_PORT}/`));
  });
}

// Tìm trình duyệt Google Chrome hoặc Microsoft Edge thật trên máy người dùng
function findSystemChromiumBinary() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(localAppData, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(programFiles, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
  ];

  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.once('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Gửi 1 lệnh CDP (Chrome DevTools Protocol) qua WebSocket có sẵn của Node 22+
function sendCdpCommand(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error('CDP timeout'));
    }, 8000);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.id === id) {
          clearTimeout(timer);
          ws.close();
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch (err) {
        clearTimeout(timer);
        ws.close();
        reject(err);
      }
    });

    ws.addEventListener('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Đồng bộ mảng cookie lấy từ Chrome thật sang phân vùng `persist:gemini` của Electron
async function importCookiesIntoGeminiSession(cdpCookies = []) {
  const geminiSession = session.fromPartition('persist:gemini');
  let imported = 0;

  for (const c of cdpCookies) {
    if (!c.name || !c.domain) continue;
    const cleanDomain = c.domain.replace(/^\./, '');
    // Chỉ nhập các cookie thuộc hệ sinh thái Google / Gemini
    if (
      !cleanDomain.endsWith('google.com') &&
      !cleanDomain.endsWith('googleapis.com') &&
      !cleanDomain.endsWith('gstatic.com') &&
      !cleanDomain.endsWith('youtube.com')
    ) {
      continue;
    }

    const protocol = c.secure ? 'https://' : 'http://';
    const cookieUrl = `${protocol}${cleanDomain}${c.path || '/'}`;

    const sameSiteMap = {
      Strict: 'strict',
      Lax: 'lax',
      None: 'no_restriction',
    };

    const details = {
      url: cookieUrl,
      name: c.name,
      value: c.value ?? '',
      path: c.path || '/',
      secure: Boolean(c.secure),
      httpOnly: Boolean(c.httpOnly),
    };

    // Host-only vs domain cookie
    if (c.domain.startsWith('.')) {
      details.domain = c.domain;
    }
    if (c.sameSite && sameSiteMap[c.sameSite]) {
      details.sameSite = sameSiteMap[c.sameSite];
      if (details.sameSite === 'no_restriction') details.secure = true;
    }
    if (!c.session && typeof c.expires === 'number' && c.expires > 0) {
      details.expirationDate = c.expires;
    }

    try {
      await geminiSession.cookies.set(details);
      imported += 1;
    } catch {
      /* một số cookie đặc thù có thể bị từ chối, bỏ qua an toàn */
    }
  }

  await geminiSession.cookies.flushStore();
  return imported;
}

// Làm mới tất cả các thẻ <webview> Gemini đang mở trong cửa sổ chính
function reloadAllGeminiWebviews() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('cozy:gemini-auth-completed');
}

/**
 * Mở trình duyệt Chrome/Edge thật trên máy để đăng nhập Google (không bao giờ bị Google chặn!),
 * sau đó tự động trích cookie đăng nhập đưa vào `persist:gemini` rồi đóng cửa sổ Chrome phụ.
 */
async function signInViaSystemBrowser(
  loginUrl = 'https://accounts.google.com/ServiceLogin?passive=true&continue=https%3A%2F%2Fgemini.google.com%2Fapp'
) {
  if (activeAuthFlow) return activeAuthFlow;

  activeAuthFlow = (async () => {
    const browserBin = findSystemChromiumBinary();
    if (!browserBin) {
      shell.openExternal(loginUrl);
      return { ok: false, reason: 'Không tìm thấy Google Chrome hoặc Microsoft Edge trên máy.' };
    }

    const port = await getFreePort();
    const profileDir = path.join(app.getPath('userData'), 'cozy-chrome-auth-profile');
    fs.mkdirSync(profileDir, { recursive: true });

    const child = spawn(
      browserBin,
      [
        `--remote-debugging-port=${port}`,
        '--remote-allow-origins=*',
        `--user-data-dir=${profileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=540,720',
        `--app=${loginUrl}`,
      ],
      { detached: false, stdio: 'ignore' }
    );

    let synced = false;
    const deadline = Date.now() + 5 * 60 * 1000; // Chờ tối đa 5 phút để người dùng nhập mật khẩu + 2FA

    while (Date.now() < deadline && child.exitCode === null) {
      await sleep(1000);
      try {
        const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
        const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (!pageTarget) continue;

        const { cookies = [] } = await sendCdpCommand(
          pageTarget.webSocketDebuggerUrl,
          'Network.getAllCookies'
        );

        // Kiểm tra đã có cookie phiên đăng nhập chính thức của Google (SID + __Secure-1PSID)
        // VÀ người dùng đã vượt qua trang accounts.google.com sang gemini.google.com
        const hasGoogleAuth = cookies.some(
          (c) =>
            (c.name === '__Secure-1PSID' || c.name === 'SID') &&
            String(c.domain).includes('google.com') &&
            c.value
        );
        const landedOnGemini = targets.some((t) => isGeminiAppUrl(t.url || ''));

        if (hasGoogleAuth && landedOnGemini) {
          // Chờ thêm 1 nhịp ngắn để Gemini hoàn tất ghi cookie phụ
          await sleep(900);
          const finalRes = await sendCdpCommand(
            pageTarget.webSocketDebuggerUrl,
            'Network.getAllCookies'
          );
          await importCookiesIntoGeminiSession(finalRes.cookies || cookies);
          synced = true;
          try {
            await sendCdpCommand(pageTarget.webSocketDebuggerUrl, 'Browser.close');
          } catch {
            child.kill();
          }
          break;
        }
      } catch {
        /* Chrome đang khởi động hoặc đang chuyển trang */
      }
    }

    // Trường hợp người dùng tự tay đóng cửa sổ sau khi đăng nhập xong
    if (!synced) {
      try {
        const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
        const pageTarget = targets.find((t) => t.webSocketDebuggerUrl);
        if (pageTarget) {
          const { cookies = [] } = await sendCdpCommand(
            pageTarget.webSocketDebuggerUrl,
            'Network.getAllCookies'
          );
          if (cookies.some((c) => c.name === 'SID' || c.name === '__Secure-1PSID')) {
            await importCookiesIntoGeminiSession(cookies);
            synced = true;
          }
        }
      } catch {
        /* cửa sổ đã đóng hẳn */
      }
    }

    if (child.exitCode === null) {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
    }

    if (synced) reloadAllGeminiWebviews();
    return { ok: synced };
  })().finally(() => {
    activeAuthFlow = null;
  });

  return activeAuthFlow;
}

function configureGeminiSession() {
  const geminiSession = session.fromPartition('persist:gemini');
  geminiSession.setUserAgent(CHROME_USER_AGENT);
}

async function createWindow() {
  configureGeminiSession();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#FDFBF7',
    title: 'CozySpace',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (DEV_URL) {
    await mainWindow.loadURL(DEV_URL);
  } else {
    const url = await startStaticServer();
    await mainWindow.loadURL(url);
  }
}

// IPC cho nút [🔑 Đăng nhập Google] trên thanh tiêu đề Gemini
ipcMain.handle('cozy:open-gemini-login', async () => signInViaSystemBrowser());

// Quản lý thẻ <webview id="gemini-webview">
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setUserAgent(CHROME_USER_AGENT);

    const injectPastelTheme = () => {
      const currentUrl = contents.getURL() || '';
      if (isGeminiAppUrl(currentUrl)) {
        contents.executeJavaScript(GEMINI_LIGHT_THEME_SCRIPT).catch(() => {});
        contents.insertCSS(GEMINI_PASTEL_CSS).catch(() => {});
      }
    };

    contents.on('dom-ready', injectPastelTheme);
    contents.on('did-navigate', injectPastelTheme);
    contents.on('did-navigate-in-page', injectPastelTheme);

    // Khi bấm nút "Sign in" bên trong <webview>, mở bằng Chrome/Edge thật rồi tự nạp cookie về <webview>
    const interceptGoogleAuth = (event, url) => {
      if (url && url.includes('accounts.google.com')) {
        event.preventDefault();
        signInViaSystemBrowser(url).then((res) => {
          if (res?.ok && !contents.isDestroyed()) {
            contents.loadURL('https://gemini.google.com/app');
          }
        });
      }
    };

    contents.on('will-navigate', interceptGoogleAuth);

    contents.setWindowOpenHandler(({ url }) => {
      if (url.includes('accounts.google.com')) {
        signInViaSystemBrowser(url).then((res) => {
          if (res?.ok && !contents.isDestroyed()) {
            contents.loadURL('https://gemini.google.com/app');
          }
        });
        return { action: 'deny' };
      }
      if (isGeminiAppUrl(url)) {
        contents.loadURL(url);
        return { action: 'deny' };
      }
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
