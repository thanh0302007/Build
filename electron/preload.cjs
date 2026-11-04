// Cầu nối an toàn giữa Electron Main Process và giao diện React
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cozyEnv', {
  isElectron: true,
  platform: process.platform,

  // Cơ sở dữ liệu & tệp lưu trên ổ cứng máy tính
  initDbSync: () => ipcRenderer.sendSync('cozy:db-init-sync'),
  writeDbKey: (key, value) => ipcRenderer.invoke('cozy:db-write-key', key, value),
  migrateLegacyDb: (map) => ipcRenderer.invoke('cozy:db-migrate-legacy', map),
  flushDb: () => ipcRenderer.invoke('cozy:db-flush'),
  saveMediaDataUrl: (dataUrl, prefix) => ipcRenderer.invoke('cozy:save-media-dataurl', dataUrl, prefix),
  getStorageInfo: () => ipcRenderer.invoke('cozy:get-storage-info'),
  openDataFolder: () => ipcRenderer.invoke('cozy:open-data-folder'),
  createManualSnapshot: () => ipcRenderer.invoke('cozy:create-manual-snapshot'),
  changeDataFolder: () => ipcRenderer.invoke('cozy:change-data-folder'),
  exportBackup: () => ipcRenderer.invoke('cozy:export-backup'),
  importBackup: () => ipcRenderer.invoke('cozy:import-backup'),
  restoreSnapshot: (fileName) => ipcRenderer.invoke('cozy:restore-snapshot', fileName),

  // Khay hệ thống (System Tray) & Vòng đời cửa sổ
  setCloseBehavior: (payload) => ipcRenderer.send('cozy:set-close-behavior', payload),
  quitApp: () => ipcRenderer.send('cozy:quit-app'),
  onTrayAction: (cb) => {
    const handler = (_event, action) => cb?.(action);
    ipcRenderer.on('cozy:tray-action', handler);
    return () => ipcRenderer.removeListener('cozy:tray-action', handler);
  },

  // Mở trình duyệt Google Chrome / Edge thật trên máy để đăng nhập rồi tự đồng bộ phiên về <webview>
  openGeminiSignIn: () => ipcRenderer.invoke('cozy:open-gemini-login'),
  onGeminiAuthCompleted: (cb) => {
    const handler = () => cb?.();
    ipcRenderer.on('cozy:gemini-auth-completed', handler);
    return () => ipcRenderer.removeListener('cozy:gemini-auth-completed', handler);
  },
});
