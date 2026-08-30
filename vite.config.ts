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
            // Never embed server API secrets in the browser bundle. These
            // integrations remain disabled until routed through trusted backend
            // endpoints that keep credentials server-side.
            'process.env.API_KEY': JSON.stringify(''),
            'process.env.GEMINI_API_KEY': JSON.stringify(''),
            'process.env.ALCHEMY_API_KEY': JSON.stringify(''),
            'process.env.OPENSEA_API_KEY': JSON.stringify(''),

            // Public configuration values are safe to expose to the client.
            'process.env.WALLETCONNECT_PROJECT_ID': JSON.stringify(env.WALLETCONNECT_PROJECT_ID),
            'process.env.VITE_ESCROW_ADDRESS': JSON.stringify(env.VITE_ESCROW_ADDRESS),
            'process.env.PLATFORM_WALLET': JSON.stringify(env.PLATFORM_WALLET),
            'process.env.PLATFORM_SOL_WALLET': JSON.stringify(env.PLATFORM_SOL_WALLET),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
                // Provide a browser-compatible Buffer for @solana/spl-token (Vite externalizes Node's 'buffer')
                buffer: 'buffer/',
            }
        },
        optimizeDeps: {
            include: ['buffer'],
        }
    };
});
