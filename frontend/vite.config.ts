/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React dev server runs on 5173 and proxies all API traffic to the
// FastAPI backend on 8080 so both stay same-origin from the browser's
// perspective. Production runs the built bundle straight from FastAPI.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/reports': 'http://127.0.0.1:8080',
      '/stats': 'http://127.0.0.1:8080',
      '/transactions': 'http://127.0.0.1:8080',
      '/health': 'http://127.0.0.1:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});