
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/FreezerList',
  build: {
    outDir: 'dist',
  },
  plugins: [react()],
})