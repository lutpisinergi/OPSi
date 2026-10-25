import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' agar kompatibel dengan GitHub Pages / subpath deployment
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
