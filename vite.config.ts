import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.ALCHEMY_API_KEY': JSON.stringify(env.ALCHEMY_API_KEY),
        'process.env.WALLETCONNECT_PROJECT_ID': JSON.stringify(env.WALLETCONNECT_PROJECT_ID),
      'process.env.VITE_ESCROW_ADDRESS': JSON.stringify(env.VITE_ESCROW_ADDRESS)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
