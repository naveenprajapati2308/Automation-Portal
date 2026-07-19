import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Backend listens on 8080 whether run locally (mvn) or inside its
      // container; only the docker-compose host mapping (8081) differs.
      '/api':         'http://127.0.0.1:8080',
      '/swagger-ui':  'http://127.0.0.1:8080',
      '/v3/api-docs': 'http://127.0.0.1:8080',
    }
  }
});
