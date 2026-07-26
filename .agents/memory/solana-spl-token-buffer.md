---
name: Solana spl-token Buffer fix
description: @solana/spl-token uses Buffer as a global; statically importing it in Vite causes a crash due to ES module loading order.
---

## The problem
`@solana/spl-token` references `Buffer` as a bare global variable (not via import) in its bundled output.
Vite externalises Node's `buffer` module, so `Buffer` is `undefined` in the browser.
Setting `globalThis.Buffer` in `index.tsx` does NOT help because ES module leaf nodes execute before
the importer's top-level code runs — so `@solana/spl-token` initialises before the polyfill.

## The fix
Do NOT statically import from `@solana/spl-token`. Use dynamic import inside an async function:
```ts
const executeSPL = async () => {
    const { getAssociatedTokenAddress, createTransferCheckedInstruction, getMint } =
        await import('@solana/spl-token');
    // ... rest of function
};
```
This way the module is loaded lazily, long after the polyfill in `index.tsx` has run.

## Supporting polyfill (belt-and-suspenders)
In `index.tsx` (very first lines, before any other imports):
```ts
import { Buffer } from 'buffer';
(globalThis as any).Buffer = (globalThis as any).Buffer ?? Buffer;
```

In `vite.config.ts`:
```ts
resolve: { alias: { buffer: 'buffer/' } }
optimizeDeps: { include: ['buffer'] }
```

**Why:** ES modules execute depth-first; leaf modules run before their importers. The polyfill must
be deferred relative to @solana/spl-token's initialisation, which only dynamic import guarantees.

## Files affected
- `index.tsx` — Buffer polyfill at top
- `vite.config.ts` — buffer alias + optimizeDeps
- `components/RepayModal.tsx` — dynamic import in executeSPL
- `components/ShopBuyModal.tsx` — dynamic import in executeSPL

## Platform wallet env vars
Token payments require two env vars (set in Replit secrets):
- `PLATFORM_WALLET` — EVM 0x address (42 chars) receiving DIG/PC-ETH
- `PLATFORM_SOL_WALLET` — Solana base58 address receiving PC-SOL
Without these, token options show "Not configured" and are greyed out.

## wagmi writeContractAsync type
In this project (wagmi v2), `writeContractAsync` requires `(... as any)({...})` cast — the strict
type demands `chain` and `account` fields that the simpler write pattern doesn't provide. This
matches the pattern in `hooks/useEscrow.ts`.
