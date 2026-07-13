---
name: DigiPawns architecture
description: Key data collections, admin detection, social messaging approach, NFT transfer flow, and Web3 wallet setup
---

## Firestore collections
Users, loans (with `status`/`nftTransferStatus`), friends, messages, activities, notificationSettings, collections, shopInventory, ownedItems. Admin is a boolean flag on the user profile, not a separate role table. Firestore security rules live in `firestore.rules` and must be pasted manually into the Firebase Console by the user — the repo copy is not auto-deployed.

## Real Web3 wallet layer (added; testnet-only)
Wallet connection uses wagmi v2 + viem v2 (NOT the wagmi v3 latest — v3 requires `typescript>=5.9.3` and conflicts with this project's pinned TS, causing an ERESOLVE npm error). Configured for Base Sepolia via an injected/MetaMask connector in `lib/web3.ts`, wired up with `WagmiProvider`+`QueryClientProvider` in `index.tsx`.

**Why:** the app originally faked all Web3 (wallet address was a free-text Firestore field, "NFTs" were Gemini-hallucinated, no chain interaction existed). The user explicitly rejected fake Web3 and asked for it to be real, starting on testnet.

**How to apply:** Firebase auth (`isConnected`) remains the "app account" layer (profile/social/admin gating) — kept separate from the real on-chain wallet (`isWalletConnected`/`walletAddress` in `AppContext`, sourced from wagmi's `useAccount`, not user-typed text). Any future Web3 work (real NFT indexing via Alchemy, an escrow smart contract for loan collateral, on-chain shop transfers) should follow this same "testnet first, real data only" pattern rather than reintroducing simulated fallbacks — see conversation history for the specific phased plan if resuming this work.
