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
- `pages/` — top-level routed pages (Home, Dashboard, Admin, etc.)
- `components/` — shared UI components
- `contexts/` — React Context providers (wallet/session, loans, etc.)
- `services/` — Gemini AI calls (`geminiService.ts`), simulated NFT portfolio (`nftService.ts`)
- `hooks/` — custom hooks
- `firebase.ts` / `firebase-applet-config.json` — Firebase SDK init
- `mock-data.ts`, `constants.ts` — fallback/demo data (e.g. placeholder featured collections)

## Notes
- `index.html` still contains a leftover `<script type="importmap">` pointing at `aistudiocdn.com` from the original AI Studio scaffold. It is unused now that the project runs through Vite/npm (Vite resolves imports from `node_modules`), so it's safe to ignore or remove later.
- See `.agents/memory/digipawns-arch.md` for deeper architecture notes (Firestore collections, admin detection, messaging, NFT transfer flow).
