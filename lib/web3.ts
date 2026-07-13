import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Real Web3 wallet connectivity for DigiPawns.
// Phase 1: connect an actual browser wallet (MetaMask, etc.) on the Base
// Sepolia public testnet. No API key is required for basic RPC access —
// Base's public testnet RPC is free and rate-limited but fine for reads
// and signing transactions. When we add real NFT indexing (Phase 2) and
// the escrow smart contract (Phase 3), a paid RPC/indexer key can replace
// this transport without touching the rest of the app.
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

export const TARGET_CHAIN = baseSepolia;
