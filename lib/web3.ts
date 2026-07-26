import { http, createConfig } from 'wagmi';
import { mainnet, polygon, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// DigiPawns supports three EVM chains:
//  - Ethereum mainnet  (chain 1)   — $DIG and $PC (ERC-20) live here
//  - Polygon mainnet   (chain 137) — $DIG also available here
//  - Base Sepolia      (chain 84532) — testnet for the escrow contract
//
// Solana is handled by a separate provider stack (ConnectionProvider +
// WalletProvider from @solana/wallet-adapter-react) — see index.tsx.

const walletConnectProjectId = process.env.WALLETCONNECT_PROJECT_ID;

export const SUPPORTED_EVM_CHAINS = [mainnet, polygon, baseSepolia] as const;
export const SUPPORTED_EVM_CHAIN_IDS = SUPPORTED_EVM_CHAINS.map(c => c.id);

/** Base Sepolia stays as the deployment target for DigiPawnsEscrow contract. */
export const TARGET_CHAIN = baseSepolia;

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'DigiPawns' }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
      : []),
  ],
  transports: {
    [mainnet.id]:    http(),   // Ethereum mainnet — public RPC
    [polygon.id]:   http(),   // Polygon mainnet  — public RPC
    [baseSepolia.id]: http('https://sepolia.base.org'),
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
