import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        brokers: resolve(__dirname, 'brokers.html'),
        apply: resolve(__dirname, 'apply.html'),
        claim: resolve(__dirname, 'claim.html'),
        holders: resolve(__dirname, 'holders.html'),
      },
    },
  },
});
