---
name: CoinGecko API quirks
description: Free-tier usage patterns, contract address casing, token price fallback.
---

## Contract address casing
- CoinGecko's `/simple/token_price/ethereum` endpoint normalizes contract addresses to **lowercase** in response keys
- Always use lowercase addresses when looking up results: `tokens['0xf65a4a13...']?.usd`

## Free-tier cache strategy
- priceService.ts uses a 60-second module-level cache + in-flight deduplication (`inFlight` promise)
- Pattern: if (cache && within TTL) return cache; if (inFlight) return inFlight; else fetch new
- `invalidatePriceCache()` exported for manual refresh button

## Token price availability
- ETH, MATIC, SOL: always available via `/simple/price?ids=ethereum,matic-network,solana`
- $DIG (0xf65A...): may not be listed on CoinGecko — falls back to null; UI shows "Price unavailable"
- $PC (0x2Fe2...): same situation

## Balance reads
- ERC-20 balances: wagmi `useReadContracts` with `chainId: mainnet.id` — reads from ETH mainnet regardless of connected chain
- Cross-chain reads work in wagmi v2 by specifying `chainId` per contract entry
- SPL balance: `connection.getParsedTokenAccountsByOwner(owner, { mint })` — returns empty array (not error) if no account for that mint
- `$PC SOL mint: EFzKRUaSvLSehersFS12eXS4Nts32Mn9CKhftghFSarE`
- `$DIG ETH: 0xf65A4a13D3DE514E1241ba515F0DE2B53eA8394B`
- `$PC ETH: 0x2Fe269292f74F0a98C5786088317B4f86313C211`

## $DIG on Polygon — unverified
- Task spec mentions $DIG "also on Polygon at same address if deployed there"
- This was NOT wired — only Ethereum reads are implemented
- Verify on Polygonscan before adding Polygon $DIG reads
