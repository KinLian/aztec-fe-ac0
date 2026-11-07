import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relative base so the built site works from any folder or static host
  base: './',
});
