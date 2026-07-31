import type { Nft } from '../types';

// Alchemy network identifiers for each supported EVM chain.
export type AlchemyNetwork = 'eth-mainnet' | 'polygon-mainnet' | 'base-sepolia';

export const CHAIN_TO_ALCHEMY_NETWORK: Record<number, AlchemyNetwork> = {
    1:     'eth-mainnet',
    137:   'polygon-mainnet',
    84532: 'base-sepolia',
};

interface AlchemyNftImage {
    cachedUrl?: string;
    thumbnailUrl?: string;
    originalUrl?: string;
}

interface AlchemyNftContract {
    address: string;
    name?: string;
    symbol?: string;
}

interface AlchemyOwnedNft {
    contract: AlchemyNftContract;
    tokenId: string;
    name?: string;
    image?: AlchemyNftImage;
}

interface AlchemyGetNftsForOwnerResponse {
    ownedNfts: AlchemyOwnedNft[];
    totalCount: number;
    pageKey?: string;
}

const FALLBACK_IMAGE = 'https://placehold.co/200x200/1a1a2e/d4af37?text=No+Image';

// ── Floor price lookup ─────────────────────────────────────────────────────

interface AlchemyFloorPriceMarket {
    floorPrice?: number;
    priceCurrency?: string;
    error?: string;
}

interface AlchemyFloorPriceResponse {
    openSea?: AlchemyFloorPriceMarket;
    looksRare?: AlchemyFloorPriceMarket;
}

// In-memory cache for floor price results keyed by "network:contractAddress".
// TTL is 5 minutes; entries are evicted lazily on next read.
const FLOOR_PRICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface FloorPriceCacheEntry {
    value: { floorPriceEth: number; source: string } | null;
    fetchedAt: number; // Date.now()
}

const floorPriceCache = new Map<string, FloorPriceCacheEntry>();

/**
 * Fetch the collection floor price for a contract address via Alchemy.
 * Results are cached in-memory for 5 minutes per (network, contractAddress)
 * pair to avoid hitting Alchemy rate limits on rapid repeated appraisals.
 * Tries eth-mainnet by default (where most valued collections live).
 * Returns { floorPriceEth, source } on success, or null if unavailable.
 */
export async function fetchCollectionFloorPrice(
    contractAddress: string,
    network: AlchemyNetwork = 'eth-mainnet',
): Promise<{ floorPriceEth: number; source: string } | null> {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey || !contractAddress) return null;

    const cacheKey = `${network}:${contractAddress.toLowerCase()}`;
    const cached = floorPriceCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < FLOOR_PRICE_CACHE_TTL_MS) {
        return cached.value;
    }

    try {
        const url = new URL(
            `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getFloorPrice`,
        );
        url.searchParams.set('contractAddress', contractAddress);

        const res = await fetch(url.toString());
        if (!res.ok) {
            console.warn(`Alchemy getFloorPrice returned ${res.status} for ${contractAddress}`);
            return null;
        }

        const data: AlchemyFloorPriceResponse = await res.json();

        // Prefer OpenSea floor, fall back to LooksRare
        const markets: Array<[string, AlchemyFloorPriceMarket | undefined]> = [
            ['OpenSea', data.openSea],
            ['LooksRare', data.looksRare],
        ];

        let result: { floorPriceEth: number; source: string } | null = null;
        for (const [source, market] of markets) {
            if (
                market &&
                !market.error &&
                typeof market.floorPrice === 'number' &&
                market.floorPrice > 0
            ) {
                result = { floorPriceEth: market.floorPrice, source };
                break;
            }
        }

        floorPriceCache.set(cacheKey, { value: result, fetchedAt: Date.now() });
        return result;
    } catch (err) {
        console.warn('fetchCollectionFloorPrice failed:', err);
        return null;
    }
}

// ── NFT portfolio fetch ────────────────────────────────────────────────────

/** Fetch NFTs for a single wallet address on one Alchemy network. */
async function fetchNftsFromNetwork(
    walletAddress: string,
    network: AlchemyNetwork,
    apiKey: string,
): Promise<Nft[]> {
    const url = new URL(`https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`);
    url.searchParams.set('owner', walletAddress);
    url.searchParams.set('withMetadata', 'true');
    url.searchParams.set('pageSize', '100');

    let response: Response;
    try {
        response = await fetch(url.toString());
    } catch {
        throw new Error('Could not reach the NFT indexing service. Check your connection and try again.');
    }

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('Alchemy NFT API error:', response.status, body);
        throw new Error(`Failed to fetch NFT portfolio on ${network} (status ${response.status}).`);
    }

    const data: AlchemyGetNftsForOwnerResponse = await response.json();

    return (data.ownedNfts ?? []).map((nft): Nft => {
        const contractAddress = nft.contract?.address ?? '';
        const tokenId = nft.tokenId ?? '';
        const collection = nft.contract?.name || nft.contract?.symbol || 'Unnamed Collection';
        const name = nft.name || `${collection} #${tokenId}`;
        const imageUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || FALLBACK_IMAGE;

        return {
            id: `${network}-${contractAddress}-${tokenId}`,
            name,
            collection,
            imageUrl,
            // Real on-chain ownership confirmed by Alchemy. USD value is intentionally
            // 0 here — actual appraisals come from the Quick Appraise flow, never fabricated.
            estimatedValue: 0,
            contractAddress,
            tokenId,
        };
    });
}

// ── Solana NFT fetch ───────────────────────────────────────────────────────

/**
 * Returns true when the address looks like a Solana base58 public key
 * (no 0x prefix, 32-44 characters of base58 alphabet).
 */
export function isSolanaAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
}

/**
 * Fetch NFTs owned by a Solana wallet address via Alchemy's Solana mainnet
 * NFT endpoint. Returns the same Nft shape as the EVM fetch so both can be
 * displayed in the same picker grid.
 */
export async function fetchSolanaNftsFromWallet(walletAddress: string): Promise<Nft[]> {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
        throw new Error('NFT indexing isn\'t configured yet (missing Alchemy API key).');
    }

    const network = 'solana-mainnet';
    const url = new URL(`https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`);
    url.searchParams.set('owner', walletAddress.trim());
    url.searchParams.set('withMetadata', 'true');
    url.searchParams.set('pageSize', '100');

    let response: Response;
    try {
        response = await fetch(url.toString());
    } catch {
        throw new Error('Could not reach the NFT indexing service. Check your connection and try again.');
    }

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('Alchemy Solana NFT API error:', response.status, body);
        throw new Error(`Failed to fetch Solana NFT portfolio (status ${response.status}).`);
    }

    const data: AlchemyGetNftsForOwnerResponse = await response.json();

    return (data.ownedNfts ?? []).map((nft): Nft => {
        // On Solana each NFT is its own mint; Alchemy surfaces the mint address
        // as contract.address and tokenId is typically "1".
        const contractAddress = nft.contract?.address ?? '';
        const tokenId = nft.tokenId ?? '1';
        const collection = nft.contract?.name || nft.contract?.symbol || 'Unnamed Collection';
        const name = nft.name || `${collection} #${tokenId}`;
        const imageUrl =
            nft.image?.cachedUrl ||
            nft.image?.thumbnailUrl ||
            nft.image?.originalUrl ||
            FALLBACK_IMAGE;

        return {
            // Use "solana-mainnet" prefix so AdminPage can derive the chain label.
            id: `${network}-${contractAddress}-${tokenId}`,
            name,
            collection,
            imageUrl,
            estimatedValue: 0,
            contractAddress,
            tokenId,
        };
    });
}

/**
 * Fetch NFTs for a wallet address across all specified Alchemy networks.
 * Defaults to all three supported EVM networks (Ethereum, Polygon, Base Sepolia).
 * Results are merged and de-duplicated by contract+tokenId.
 */
export const fetchNftsForWallet = async (
    walletAddress: string,
    networks: AlchemyNetwork[] = ['eth-mainnet', 'polygon-mainnet', 'base-sepolia'],
): Promise<Nft[]> => {
    const apiKey = process.env.ALCHEMY_API_KEY;

    if (!apiKey) {
        throw new Error('NFT indexing isn\'t configured yet (missing Alchemy API key).');
    }

    // Fetch from all networks in parallel; don't let one failure block the others.
    const results = await Promise.allSettled(
        networks.map(n => fetchNftsFromNetwork(walletAddress, n, apiKey)),
    );

    const all: Nft[] = [];
    const seen = new Set<string>();

    for (const result of results) {
        if (result.status === 'fulfilled') {
            for (const nft of result.value) {
                const key = `${nft.contractAddress}-${nft.tokenId}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    all.push(nft);
                }
            }
        }
        // Silently swallow per-network failures — the user still sees results from other chains.
    }

    return all;
};
