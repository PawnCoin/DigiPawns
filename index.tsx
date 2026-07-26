// Polyfill Buffer globally for @solana/spl-token and @solana/web3.js.
// These libraries reference Buffer as a global; Vite externalises Node's buffer,
// so we provide the browser-compatible npm shim before any Solana imports run.
import { Buffer } from 'buffer';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer = (globalThis as any).Buffer ?? Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import App from './App';
import { wagmiConfig } from './lib/web3';

// Solana mainnet RPC endpoint (public — can be swapped for a paid endpoint later)
const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// Register all supported Solana wallet adapters.
// autoConnect={false} — we let the user explicitly choose in WalletPickerModal.
const SOLANA_WALLETS = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new BackpackWalletAdapter(),
];

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* EVM wallet layer — wagmi v2 */}
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Solana wallet layer — @solana/wallet-adapter-react (independent of wagmi) */}
        <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
          <WalletProvider wallets={SOLANA_WALLETS} autoConnect={false}>
            <App />
          </WalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
