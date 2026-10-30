// Cầu nối an toàn giữa Electron và giao diện React
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cozyEnv', {
  isElectron: true,
  platform: process.platform,
  // Mở trình duyệt Google Chrome / Edge thật trên máy để đăng nhập rồi tự đồng bộ phiên về <webview>
  openGeminiSignIn: () => ipcRenderer.invoke('cozy:open-gemini-login'),
  onGeminiAuthCompleted: (cb) => {
    const handler = () => cb?.();
    ipcRenderer.on('cozy:gemini-auth-completed', handler);
    return () => ipcRenderer.removeListener('cozy:gemini-auth-completed', handler);
  },
});
