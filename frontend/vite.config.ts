import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: false, port: 5320, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:8320', ws: true } } },
  preview: { host: false, port: 5321, strictPort: true },
  build: { target: 'es2022', sourcemap: true }
});
