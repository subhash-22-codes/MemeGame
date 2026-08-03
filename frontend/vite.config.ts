import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react','jwt-decode'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',  // Proxy all requests starting with /api to Flask backend
    },
  },
});
