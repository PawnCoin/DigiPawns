/**
 * priceService — live USD prices from CoinGecko's free public API.
 *
 * Results are cached module-level for 60 seconds to avoid rate-limiting.
 * Any fetch error silently returns null for that token — callers must handle
 * the "price unavailable" state in the UI.
 */

const CACHE_TTL_MS = 60_000;

const DIG_ADDRESS    = '0xf65a4a13d3de514e1241ba515f0de2b53ea8394b'; // lowercase for CoinGecko
const PC_ETH_ADDRESS = '0x2fe269292f74f0a98c5786088317b4f86313c211';

export interface TokenPrices {
    eth:   number | null;
    matic: number | null;
    sol:   number | null;
    dig:   number | null;
    pc:    number | null;
}

let cache: { ts: number; data: TokenPrices } | null = null;
let inFlight: Promise<TokenPrices> | null = null;

async function loadPrices(): Promise<TokenPrices> {
    const nativeUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network,solana&vs_currencies=usd';
    const tokenUrl  = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${DIG_ADDRESS},${PC_ETH_ADDRESS}&vs_currencies=usd`;

    const [nativeRes, tokenRes] = await Promise.allSettled([
        fetch(nativeUrl).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(tokenUrl).then(r => r.ok ? r.json() : Promise.reject(r.status)),
    ]);

    const native = nativeRes.status === 'fulfilled' ? nativeRes.value : {};
    const tokens = tokenRes.status === 'fulfilled'  ? tokenRes.value  : {};

    return {
        eth:   native?.ethereum?.usd         ?? null,
        matic: native?.['matic-network']?.usd ?? null,
        sol:   native?.solana?.usd            ?? null,
        dig:   tokens?.[DIG_ADDRESS]?.usd    ?? null,
        pc:    tokens?.[PC_ETH_ADDRESS]?.usd ?? null,
    };
}

/**
 * Fetch token prices, returning from cache if it's still fresh.
 * Multiple simultaneous callers share a single in-flight request.
 */
export async function fetchTokenPrices(): Promise<TokenPrices> {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
    if (inFlight) return inFlight;

    inFlight = loadPrices()
        .then(data => { cache = { ts: Date.now(), data }; return data; })
        .catch(() => ({ eth: null, matic: null, sol: null, dig: null, pc: null }))
        .finally(() => { inFlight = null; });

    return inFlight;
}

/** Invalidate cache — useful for manual refresh. */
export function invalidatePriceCache() {
    cache = null;
}
