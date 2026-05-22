import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/dashboard-project/' : '/',
  server: { port: 5173, host: true }
});
