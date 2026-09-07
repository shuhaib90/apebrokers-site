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
        brokerdesk: resolve(__dirname, 'brokerdesk.html'),
        staking: resolve(__dirname, 'staking.html'),
        luckydraw: resolve(__dirname, 'luckydraw.html'),
      },
    },
  },
});
