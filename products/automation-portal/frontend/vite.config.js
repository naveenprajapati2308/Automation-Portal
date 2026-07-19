import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served at /automation/ behind the Testrix gateway (VITE_BASE set in the
  // gateway image build); plain '/' for local dev.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: ['..', '../../../../shared'] },
    proxy: {
      '/api':         'http://127.0.0.1:8080',
      '/uploads':     'http://127.0.0.1:8080',
      '/swagger-ui':  'http://127.0.0.1:8080',
      '/v3/api-docs': 'http://127.0.0.1:8080',
    }
  }
});
