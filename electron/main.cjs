// CozySpace - Electron main process
// - Dev: nạp Vite dev server (VITE_DEV_SERVER_URL)
// - Production: phục vụ thư mục dist/ qua server HTTP tĩnh nội bộ với CỔNG CỐ ĐỊNH
//   (origin cố định => localStorage bền vững; YouTube embed hoạt động ổn định hơn file://)
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const PROD_PORT = 47821;
const DIST_DIR = path.join(__dirname, '..', 'dist');

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

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#FDFBF7',
    title: 'CozySpace',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Bật thẻ <webview> cho Khu vực Học tập + Gemini (Quy định I.1)
      webviewTag: true,
    },
  });

  // Link ngoài (target=_blank) mở bằng trình duyệt mặc định
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (DEV_URL) {
    await win.loadURL(DEV_URL);
  } else {
    const url = await startStaticServer();
    await win.loadURL(url);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

