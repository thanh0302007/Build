import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' để Electron có thể nạp bản build qua server tĩnh nội bộ hoặc file://
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
  },
});

