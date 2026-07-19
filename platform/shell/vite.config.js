import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5170,
    fs: { allow: ['..', '../../shared'] },
    proxy: {
      '/automation/api': { target: 'http://127.0.0.1:18080', rewrite: (p) => p.replace('/automation', '') },
      '/apitest/api': { target: 'http://127.0.0.1:8081', rewrite: (p) => p.replace('/apitest', '') },
      '/genai': { target: 'http://127.0.0.1:3000', rewrite: (p) => p.replace('/genai', '') }
    }
  }
});
