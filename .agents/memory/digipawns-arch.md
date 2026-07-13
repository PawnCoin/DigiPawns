---
name: DigiPawns architecture
description: Key data collections, admin detection, social messaging approach, NFT transfer flow, and Web3 wallet setup
---

## Firestore collections
Users, loans (with `status`/`nftTransferStatus`), friends, messages, activities, notificationSettings, collections, shopInventory, ownedItems. Admin is a boolean flag on the user profile, not a separate role table. Firestore security rules live in `firestore.rules` and must be pasted manually into the Firebase Console by the user — the repo copy is not auto-deployed.

## Real Web3 wallet layer (added; testnet-only)
Wallet connection uses wagmi v2 + viem v2 (NOT the wagmi v3 latest — v3 requires `typescript>=5.9.3` and conflicts with this project's pinned TS, causing an ERESOLVE npm error). Configured for Base Sepolia via an injected/MetaMask connector in `lib/web3.ts`, wired up with `WagmiProvider`+`QueryClientProvider` in `index.tsx`.

**Why:** the app originally faked all Web3 (wallet address was a free-text Firestore field, "NFTs" were Gemini-hallucinated, no chain interaction existed). The user explicitly rejected fake Web3 and asked for it to be real, starting on testnet.

**How to apply:** Firebase auth (`isConnected`) remains the "app account" layer (profile/social/admin gating) — kept separate from the real on-chain wallet (`isWalletConnected`/`walletAddress` in `AppContext`, sourced from wagmi's `useAccount`, not user-typed text). Any future Web3 work (an escrow smart contract for loan collateral, on-chain shop transfers) should follow this same "testnet first, real data only" pattern rather than reintroducing simulated fallbacks — see conversation history for the specific phased plan if resuming this work.

## Real NFT indexing (Phase 2, added)
`services/nftService.ts` now calls Alchemy's NFT API (`getNFTsForOwner`, network `base-sepolia`) directly from the client instead of Gemini-hallucinating a portfolio. The Alchemy key is baked into the client bundle via Vite's `define` (same pattern already used for the Gemini key) — there is no backend/proxy in this project, it's a pure Vite SPA.

**Why:** this project has no server layer to hide the key behind; the existing Gemini integration already ships its key client-side the same way, so this stays consistent rather than introducing a one-off backend just for Alchemy.

**How to apply:** if a backend is ever added, move both the Gemini and Alchemy calls behind it. Until then, tell the user to restrict the Alchemy key by allowed domain in the Alchemy dashboard. Per-NFT `estimatedValue` from this listing is intentionally always `0` — real valuations only come from the separate Quick-Appraise flow (`services/geminiService.ts`), never fabricated as part of the wallet listing.

## Multi-wallet connect (added)
`lib/web3.ts` registers three wagmi connectors: `injected()` (any EIP-1193 browser extension, not just MetaMask), `coinbaseWallet()`, and `walletConnect()` (needs a free `WALLETCONNECT_PROJECT_ID` from cloud.reown.com — connector list conditionally omits it if the key is absent). `components/WalletPickerModal.tsx` shows a chooser instead of assuming one wallet; `connectRealWallet(connectorId?)` in `AppContext` takes an optional connector id.

**Why:** user explicitly asked not to be limited to MetaMask.

**How to apply:** when adding another connector in future, add it to `WALLET_OPTIONS` in `lib/web3.ts` with a matching `id` (check the connector's actual `id` field in its source, e.g. Coinbase's is `coinbaseWalletSDK`, not `coinbaseWallet`) so the picker UI and `connectRealWallet` stay in sync.
