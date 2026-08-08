---
name: Solana + wagmi coexistence
description: How EVM (wagmi v2) and Solana wallet adapter run side-by-side; known quirks and patterns.
---

## Setup
- wagmi v2 wraps the app in `WagmiProvider` + `QueryClientProvider`
- Solana wraps inside those with `ConnectionProvider` (endpoint: mainnet-beta) + `WalletProvider` (autoConnect: false)
- Order in index.tsx: WagmiProvider > QueryClientProvider > ConnectionProvider > WalletProvider > App

## Chain IDs in wagmiConfig
- mainnet (1), polygon (137), base (8453) — all three must be in `wagmiConfig.chains`
- `SUPPORTED_EVM_CHAIN_IDS.includes(chainId)` cast needed: `(list as readonly number[]).includes(chainId)`
- `TARGET_CHAIN = base` (Base Mainnet, chain 8453) for escrow contract; `isCorrectChain` checks ALL three

## Solana wallet adapter quirks
- `useWallet().select(name)` is synchronous and triggers state update; `connect()` is called in a useEffect watching `wallet?.adapter.name`
- PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter are the three registered adapters
- `@solana/wallet-adapter-wallets` is blocked by security policy (protobufjs dep); install individual adapters instead
- `getParsedTokenAccountsByOwner` returns parsed JSON with `uiAmount` — no need for @solana/spl-token

## Buffer warning
- `Module "buffer" has been externalized for browser compatibility` — harmless; @solana/web3.js ships its own browser Buffer
- Do NOT add a vite buffer polyfill unless a real error (not warning) appears

## solanaAddress persistence
- Solana public key → base58 string stored in Firestore users/{uid}.solanaAddress on connect
- EVM address stored similarly in users/{uid}.walletAddress
