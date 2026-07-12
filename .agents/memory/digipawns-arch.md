---
name: DigiPawns Architecture
description: Key data model, admin detection, social features, NFT transfer flow, and Firebase rules approach
---

## Firestore Collections
- `users/{uid}` — UserProfile, includes `isAdmin: boolean`, `bio`, `walletAddress`
- `loans/{loanId}` — Loan, includes `nftTransferStatus` ('awaiting_transfer'|'received'|'active'|'returned'|'liquidated')
- `activities/{id}` — activity log per user
- `notificationSettings/{uid}` — user notification prefs
- `friends/{uid}_{friendUid}` — bidirectional (both directions written on add, both deleted on remove)
- `messages/{id}` — `{conversationId, fromUid, fromUsername, toUid, text, timestamp, read}`; `conversationId = [uid1,uid2].sort().join('_')`
- `collections/{id}` — admin-curated NFT collections; public read, admin-only write

## Admin Detection
`isAdmin: boolean` field on user doc in Firestore. Set first admin manually in Firebase console.
Firestore rules use `get(/databases/.../users/$(request.auth.uid)).data.get('isAdmin', false) == true`.

## Firestore Rules
Rules are in `firestore.rules` but need to be deployed manually via Firebase console (no firebase.json/CLI configured).
**Why:** Firebase CLI not set up in Replit env; user must paste rules into Firebase Console → Firestore → Rules tab.

## Social Messaging
Two Firestore listeners: one for `toUid == userId`, one for `fromUid == userId`. Merged in state deduped by message id.
**Why:** Firestore doesn't support OR across different fields without composite indexes.

## NFT Transfer Flow
Loans created with `nftTransferStatus: 'awaiting_transfer'`. Admin toggles it per loan in AdminPage.
Real on-chain transfer would require a smart contract (Solidity/Rust) — not yet built. Current flow is manual admin confirmation.

## Collections Fallback
FeaturedNfts shows PLACEHOLDER_COLLECTIONS (hardcoded 6 real NFT collections) if Firestore `collections` is empty.
Admin can add/edit/delete via AdminPage → Collections tab to override placeholders.

## User Search
Uses Firestore prefix query: `where('username', '>=', q), where('username', '<=', q + '\uf8ff')` — requires username to be lowercase-consistent for best results.
