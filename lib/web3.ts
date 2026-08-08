import { http, createConfig } from 'wagmi';
import { mainnet, polygon, base } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// DigiPawns supports three EVM chains:
//  - Ethereum mainnet  (chain 1)   — $DIG and $PC (ERC-20) live here
//  - Polygon mainnet   (chain 137) — $DIG also available here
//  - Base Mainnet      (chain 8453) — DigiPawnsEscrow contract lives here
//
// Solana is handled by a separate provider stack (ConnectionProvider +
// WalletProvider from @solana/wallet-adapter-react) — see index.tsx.

const walletConnectProjectId = process.env.WALLETCONNECT_PROJECT_ID;

export const SUPPORTED_EVM_CHAINS = [mainnet, polygon, base] as const;
export const SUPPORTED_EVM_CHAIN_IDS = SUPPORTED_EVM_CHAINS.map(c => c.id);

/** Base Mainnet — deployment chain for DigiPawnsEscrow contract. */
export const TARGET_CHAIN = base;

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'DigiPawns' }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
      : []),
  ],
  transports: {
    [mainnet.id]: http(),   // Ethereum mainnet — public RPC
    [polygon.id]: http(),   // Polygon mainnet  — public RPC
    [base.id]:    http(),   // Base Mainnet     — public RPC
  },
});

export interface WalletOption {
  id: string;
  label: string;
  description: string;
}

// Friendly metadata for the EVM wallet-picker UI, keyed by connector id.
export const WALLET_OPTIONS: WalletOption[] = [
  { id: 'injected',         label: 'Browser Wallet',  description: 'MetaMask, Rabby, Brave, OKX, or any installed extension' },
  { id: 'coinbaseWalletSDK', label: 'Coinbase Wallet', description: 'Extension or Coinbase Wallet app' },
  ...(walletConnectProjectId
    ? [{ id: 'walletConnect', label: 'WalletConnect', description: 'Scan a QR code with any mobile wallet' }]
    : []),
];

// Solana wallet options (adapter-based — separate from wagmi).
export const SOLANA_WALLET_OPTIONS = [
  { name: 'Phantom',  description: 'Most popular Solana wallet',   icon: '👻' },
  { name: 'Solflare', description: 'Official Solflare wallet',      icon: '☀️' },
  { name: 'Backpack', description: 'xNFT & multi-chain wallet',    icon: '🎒' },
];
