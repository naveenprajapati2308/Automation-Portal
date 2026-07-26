import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: {
    // shared/ui/dashboard's chart components import these bare specifiers, but that
    // directory has no node_modules of its own (it's plain shared source, not a
    // package) — Rollup resolves bare imports relative to the importing file's real
    // disk location, so without this alias a production build fails to find them.
    alias: {
      'chart.js': fileURLToPath(new URL('./node_modules/chart.js', import.meta.url)),
      'react-chartjs-2': fileURLToPath(new URL('./node_modules/react-chartjs-2', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    fs: { allow: ['..', '../../../shared'] },
    proxy: {
      // Backend listens on 8080 whether run locally (mvn) or inside its
      // container; only the docker-compose host mapping (8081) differs.
      '/api':         'http://127.0.0.1:8080',
      '/swagger-ui':  'http://127.0.0.1:8080',
      '/v3/api-docs': 'http://127.0.0.1:8080',
    }
  }
});
