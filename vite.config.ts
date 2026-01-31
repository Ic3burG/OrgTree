import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Use default Vite port, NOT 3001
    host: true, // Listen on all addresses
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
      },
      '/api-geds': {
        target: 'https://geds-sage.gc.ca',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-geds/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - loaded on every page
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // React Flow - only needed for org chart visualization
          'vendor-reactflow': ['reactflow', 'dagre'],
          // PDF/Image export - only needed when exporting
          'vendor-export': ['jspdf', 'html-to-image'],
          // Icons - loaded progressively
          'vendor-icons': ['lucide-react'],
          // Real-time & monitoring
          'vendor-realtime': ['socket.io-client', '@sentry/react'],
          // Data parsing - only needed for import/export
          'vendor-parsing': ['papaparse', 'xml2js'],
        },
      },
    },
  },
});
