import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: false, port: 5196, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:8196', ws: true } } },
  preview: { host: false, port: 5196, strictPort: true },
  build: { target: 'es2022', sourcemap: true }
});
