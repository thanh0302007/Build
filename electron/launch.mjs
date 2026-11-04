// Bộ khởi chạy Electron an toàn cho CozySpace:
// - Xóa hoàn toàn biến môi trường ELECTRON_RUN_AS_NODE (do VS Code / Antigravity IDE gán = 1),
//   đảm bảo Electron luôn mở cửa sổ Desktop thật thay vì chạy nhầm ở chế độ Node CLI.
// - Tự động kiểm tra / khởi chạy Vite dev server ở chế độ `--dev` (không bị kẹt IPv6/IPv4 hoặc trùng cổng 5173).
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const electronBin = require('electron');

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), '..');

const isDev = process.argv.includes('--dev');
const DEV_HOST = '127.0.0.1';
const DEV_PORT = 5173;
const DEV_URL = `http://${DEV_HOST}:${DEV_PORT}`;

function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkServerReady(url)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function main() {
  const cleanEnv = { ...process.env };
  delete cleanEnv.ELECTRON_RUN_AS_NODE;

  let viteProc = null;

  if (isDev) {
    const alreadyUp =
      (await checkServerReady(DEV_URL)) || (await checkServerReady(`http://localhost:${DEV_PORT}`));

    if (!alreadyUp) {
      const viteCli = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
      viteProc = spawn(process.execPath, [viteCli, '--host', DEV_HOST, '--port', String(DEV_PORT)], {
        cwd: ROOT_DIR,
        env: cleanEnv,
        stdio: 'inherit',
      });
    }

    const ready = await waitForServer(DEV_URL);
    cleanEnv.VITE_DEV_SERVER_URL = ready ? DEV_URL : `http://localhost:${DEV_PORT}`;
  }

  const electronProc = spawn(electronBin, ['.'], {
    cwd: ROOT_DIR,
    env: cleanEnv,
    stdio: 'inherit',
    windowsHide: false,
  });

  const cleanup = () => {
    if (viteProc && viteProc.exitCode === null) {
      try {
        viteProc.kill();
      } catch {
        /* ignore */
      }
    }
  };

  electronProc.on('close', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

main();

