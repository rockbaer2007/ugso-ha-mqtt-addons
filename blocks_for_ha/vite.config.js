import { defineConfig } from 'vite';

export default defineConfig({
  server: { proxy: { '/api/ha/entities': 'http://127.0.0.1:9001' } },
});
