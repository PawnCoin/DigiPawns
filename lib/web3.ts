import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Real Web3 wallet connectivity for DigiPawns.
// Phase 1: connect an actual browser wallet on the Base Sepolia public
// testnet. No API key is required for basic RPC access — Base's public
// testnet RPC is free and rate-limited but fine for reads and signing
// transactions. When we add the escrow smart contract (Phase 3), a paid
// RPC/indexer key can replace this transport without touching the rest
// of the app.
//
// Multiple wallet connectors so users aren't limited to MetaMask:
// - `injected()` covers ANY EIP-1193 browser extension (MetaMask, Rabby,
//   Brave Wallet, OKX, Trust Wallet extension, etc.) — not MetaMask-specific.
// - `coinbaseWallet()` adds Coinbase Wallet (extension or its own popup),
//   no API key required.
// - `walletConnect()` adds QR-code / mobile wallet connections (Rainbow,
//   Trust Wallet mobile, MetaMask mobile, and hundreds of others) via a
//   free WalletConnect Cloud project ID.
const walletConnectProjectId = process.env.WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'DigiPawns' }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
      : []),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

export const TARGET_CHAIN = baseSepolia;

export interface WalletOption {
  id: string;
  label: string;
  description: string;
}

// Friendly metadata for the wallet-picker UI, keyed by connector id.
export const WALLET_OPTIONS: WalletOption[] = [
  { id: 'injected', label: 'Browser Wallet', description: 'MetaMask, Rabby, Brave, OKX, or any installed extension' },
  { id: 'coinbaseWalletSDK', label: 'Coinbase Wallet', description: 'Extension or Coinbase Wallet app' },
  ...(walletConnectProjectId
    ? [{ id: 'walletConnect', label: 'WalletConnect', description: 'Scan a QR code with any mobile wallet' }]
    : []),
];
