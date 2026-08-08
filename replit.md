# DigiPawns — AI-Powered Digital Asset Pawn Shop

## Overview
DigiPawns is a Vite + React + TypeScript single-page app that simulates an NFT-backed crypto loan platform. It uses:
- **Google Gemini API** (`@google/genai`) for AI-powered NFT appraisals and simulated portfolio/collection generation.
- **Firebase** (Auth + Firestore) for user profiles, loans, activity, friends, messaging, and admin-curated collections.
- **Tailwind CSS** (via CDN script in `index.html`) for styling, **Framer Motion** for animation, **Recharts** for charts.
- Simulated Web3 wallet connection (no real on-chain transactions).

## Running the app
- Workflow "Start application" runs `npm run dev` (Vite dev server) on port 5000.
- Requires the `GEMINI_API_KEY` secret (Replit Secrets) — used for AI appraisals. The free Gemini tier works for development but has rate limits; a paid key is recommended for sustained/production use.
- Firebase is already configured via `firebase-applet-config.json`. Firestore security rules live in `firestore.rules` but must be pasted manually into the Firebase Console (no Firebase CLI configured in this environment).
- Build: `npm run build` → outputs to `dist/` (deployment target is configured as static).

## Project structure
- `pages/` — top-level routed pages (Home, Dashboard, Admin, Shop, etc.)
- `components/` — shared UI components (`components/shop/` — shop-floor card, sell, and trade-in panels)
- `contexts/` — React Context providers (wallet/session, loans, shop, etc.)
- `services/` — Gemini AI calls (`geminiService.ts`), simulated NFT portfolio (`nftService.ts`)
- `hooks/` — custom hooks
- `firebase.ts` / `firebase-applet-config.json` — Firebase SDK init
- `mock-data.ts`, `constants.ts` — fallback/demo data (e.g. placeholder featured collections, placeholder shop items)

## Shop floor (buy / sell / trade)
- `/shop` is a real pawn-shop floor built on the existing simulated-Web3 model — no real payments. Users have a simulated `balance` (store credit) on their `UserProfile`, starting at $25,000.
- Liquidating a loan (`liquidateLoan` in `AppContext`) automatically lists the forfeited collateral as a new `shopInventory` Firestore doc (marked up 15% over principal), so defaults feed real shop inventory instead of disappearing.
- Users can **buy** shop items (deducts balance, moves the item to their `ownedItems`), **sell** an NFT outright to the shop (reuses the Gemini appraisal flow, pays 60% of appraised value as store credit), or **trade in** an owned/described NFT straight-across for a shop item (no cash, item becomes new floor inventory).
- Admins get a "Shop Floor" tab in `/admin` to manually add/edit/delete listings, same CRUD pattern as the Collections tab.
- Like other collections, `shopInventory`/`ownedItems` need their Firestore rules (already added to `firestore.rules`) pasted into the Firebase Console to take effect — see task about deploying Firestore rules from Replit.

## Smart contracts (Hardhat)

The `contracts/` directory is a self-contained Hardhat project — independent from the Vite frontend.

### Stack
- Solidity 0.8.28 (EVM target: Cancun) + OpenZeppelin v5
- Hardhat 2.22 + `@nomicfoundation/hardhat-toolbox` (ethers v6, Mocha/Chai, typechain)
- TypeScript 5.8 (ts-node v10 is not compatible with TypeScript 7, so contracts pin to 5.8)

### Key contract: `contracts/contracts/DigiPawnsEscrow.sol`
Escrows ERC-721 NFT collateral for loans.
- `depositNFT(loanId, nftContract, tokenId)` — borrower transfers NFT in (must approve first)
- `releaseToOwner(loanId)` — operator sends NFT back to borrower on repayment
- `sweepToShop(loanId)` — operator sends NFT to shop wallet on default
- `updateShopAddress(newAddr)` — rotate the shop wallet (owner only)

### Common commands (run from `contracts/`)
```
npm run compile          # compile all Solidity
npm test                 # 33 tests, all passing
npm run deploy:local     # deploy to local hardhat node
npm run deploy:base         # deploy to Base Mainnet (production)
npm run deploy:baseSepolia  # deploy to Base Sepolia testnet
```

### Deployment env vars
Copy `contracts/.env.example` → `contracts/.env` and fill in:
- `DEPLOYER_PRIVATE_KEY` — deployer wallet private key
- `SHOP_ADDRESS` — wallet that receives defaulted NFT collateral
- `BASE_MAINNET_RPC_URL` — defaults to `https://mainnet.base.org`
- `BASE_SEPOLIA_RPC_URL` — defaults to `https://sepolia.base.org` (testnet only)
- `BASESCAN_API_KEY` — optional, for contract verification on Basescan

After deployment, the script prints the deployed address and a `npx hardhat verify` command. Add `VITE_ESCROW_ADDRESS=<deployed>` to Replit Secrets so the frontend can call the contract.

## Browse Wallet / Multi-chain NFT lookup
The Portfolio tab in the Dashboard has two sub-tabs:
- **My Portfolio** — shows NFTs in the connected Base Mainnet wallet (via Alchemy).
- **Browse Wallet** — lets anyone paste a wallet address, ENS name (e.g. `vitalik.eth`), or OpenSea username and fetch their NFTs across Ethereum, Base, Polygon, Arbitrum, and Optimism mainnet via Alchemy, plus Solana and all chains via OpenSea.

Each imported NFT card has:
- **Appraise & Pawn** — navigates to the homepage appraise form with contract/tokenId pre-filled.
- **Sell to Shop** — opens `BrowseSellModal`, runs a Gemini appraisal, and lists the item on the shop floor at 60% of market value.

### Required secrets
| Secret | Used for |
|--------|----------|
| `ALCHEMY_API_KEY` | Multi-chain NFT fetching (Ethereum, Base, Polygon, Arbitrum, Optimism mainnet) |
| `OPENSEA_API_KEY` | OpenSea NFT fetching + username → address resolution. Optional — Alchemy covers all EVM chains without it. Get a free key at https://docs.opensea.io/reference/api-overview |

### Relevant files
- `services/openSeaService.ts` — OpenSea API v2, Alchemy multi-chain, ENS resolution
- `services/nftService.ts` — Base Mainnet + multi-chain Alchemy fetch
- `components/SettingsView.tsx` — Portfolio + Browse Wallet UI
- `components/BrowseSellModal.tsx` — pre-filled Sell to Shop modal

## Pre-launch operations runbook

### 1 — Deploy Firestore security rules (one-time, required before going public)

The rules file `firestore.rules` is fully written and version-controlled. Deployment is **not** automated because Firebase Security Rules deployment requires browser-based OAuth authentication, which can't run in a server-side environment like Replit.

**Option A — Firebase Console (easiest, no CLI needed):**
1. Open [console.firebase.google.com](https://console.firebase.google.com) and select project `gen-lang-client-0700637310`
2. Left sidebar → **Firestore Database** → **Rules** tab
3. Replace the contents with `firestore.rules` from this repo
4. Click **Publish**
5. Confirm the "Rules published" banner appears — rules are now enforced

**Option B — Firebase CLI (from your local machine):**
```bash
# Install and login once (opens browser):
npx firebase login

# Deploy from the repo root:
npm run deploy:rules
# or: npx firebase deploy --only firestore:rules --project gen-lang-client-0700637310
```
The `firebase.json` is configured for the named database `ai-studio-58011ff9-420a-4328-a095-6c3ccf3d4217`.

**Verification:** After deploying, open the Firebase Console → Firestore → Rules tab and confirm the timestamp says "Published just now" and the ruleset matches `firestore.rules`.

> ⚠️ Until these rules are deployed, Firestore uses permissive default rules and anyone with the Firebase config (embedded in the JS bundle) can read/write all data.

---

### 2 — Platform wallet secrets (already set)

`PLATFORM_WALLET` and `PLATFORM_SOL_WALLET` are saved as Replit env vars. Token payments ($DIG, $PC-ETH, $PC-SOL) route to these addresses automatically. If addresses ever need to change, update them in Replit's Secrets/Env panel and restart the dev server.

---

### 3 — WalletConnect domain allowlist

WalletConnect QR-code connections fail with `Origin not found on Allowlist` if the app's domain isn't registered. Fix:
1. Go to [cloud.reown.com](https://cloud.reown.com) and sign in
2. Open the project matching your `WALLETCONNECT_PROJECT_ID` secret
3. Navigate to **Allowed Origins** (or **Domains**)
4. Add the following origins (if not already present):
   - `https://*.replit.dev` (dev/preview workspace)
   - `https://digi-pawns.replit.app` (Replit-generated production URL)
   - `https://digipawns.online` (custom production domain — primary public URL)
5. Save — changes take effect immediately, no redeploy needed

---

## Notes
- `index.html` still contains a leftover `<script type="importmap">` pointing at `aistudiocdn.com` from the original AI Studio scaffold. It is unused now that the project runs through Vite/npm (Vite resolves imports from `node_modules`), so it's safe to ignore or remove later.
- See `.agents/memory/digipawns-arch.md` for deeper architecture notes (Firestore collections, admin detection, messaging, NFT transfer flow).
