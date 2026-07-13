/**
 * openSeaService.ts
 *
 * Handles:
 * 1. OpenSea API v2 — fetch NFTs by address + chain, resolve username → address
 * 2. ENS name resolution (via public ensdata.net API, no key required)
 * 3. Multi-chain Alchemy NFT fetching (Ethereum, Base, Polygon, Arbitrum, Optimism mainnet)
 *
 * Gracefully degrades when keys are missing.
 */

import type { Nft } from '../types';

// ── Chain definitions ──────────────────────────────────────────────────────

export interface SupportedChain {
    id: string;           // OpenSea chain slug
    label: string;        // Human-readable label
    alchemyNetwork?: string; // Alchemy subdomain (omitted for Solana)
    badge: string;        // Short badge text
    color: string;        // Tailwind text-color class for the badge
}

export const SUPPORTED_CHAINS: SupportedChain[] = [
    { id: 'ethereum', label: 'Ethereum',  alchemyNetwork: 'eth-mainnet',     badge: 'ETH',  color: 'text-blue-300' },
    { id: 'base',     label: 'Base',      alchemyNetwork: 'base-mainnet',    badge: 'BASE', color: 'text-indigo-300' },
    { id: 'polygon',  label: 'Polygon',   alchemyNetwork: 'polygon-mainnet', badge: 'MATIC',color: 'text-purple-300' },
    { id: 'arbitrum', label: 'Arbitrum',  alchemyNetwork: 'arb-mainnet',     badge: 'ARB',  color: 'text-sky-300' },
    { id: 'optimism', label: 'Optimism',  alchemyNetwork: 'opt-mainnet',     badge: 'OP',   color: 'text-red-300' },
    { id: 'solana',   label: 'Solana',                                        badge: 'SOL',  color: 'text-green-300' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const FALLBACK_IMAGE = 'https://placehold.co/200x200/1a1a2e/d4af37?text=No+Image';

function isEthAddress(s: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(s.trim());
}

function isSolanaAddress(s: string): boolean {
    // Solana addresses are base-58, 32-44 chars, no 0x prefix
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim()) && !s.startsWith('0x');
}

function isEnsName(s: string): boolean {
    return s.trim().endsWith('.eth') || s.trim().endsWith('.xyz') || s.trim().endsWith('.io');
}

// ── ENS resolution ─────────────────────────────────────────────────────────

/**
 * Resolves an ENS name (e.g. "vitalik.eth") to a wallet address.
 * Uses the free ensdata.net public API — no API key required.
 * Returns null if resolution fails or name is not registered.
 */
export async function resolveEnsName(ensName: string): Promise<string | null> {
    try {
        const res = await fetch(`https://ensdata.net/${encodeURIComponent(ensName.trim())}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.address ?? null;
    } catch {
        return null;
    }
}

// ── OpenSea username resolution ────────────────────────────────────────────

/**
 * Resolves an OpenSea username (e.g. "punk6529") to a wallet address.
 * Requires an OpenSea API key (OPENSEA_API_KEY secret).
 * Returns null if no key or resolution fails.
 */
export async function resolveOpenSeaUsername(username: string): Promise<{ address: string | null; error?: string }> {
    const apiKey = process.env.OPENSEA_API_KEY;

    // Without a key we can't call the accounts endpoint; tell the caller why.
    if (!apiKey) {
        return { address: null, error: 'no-key' };
    }

    try {
        const res = await fetch(`https://api.opensea.io/api/v2/accounts/${encodeURIComponent(username.trim())}`, {
            headers: { 'x-api-key': apiKey, 'accept': 'application/json' },
        });
        if (!res.ok) return { address: null };
        const data = await res.json();
        return { address: data?.address ?? null };
    } catch {
        return { address: null };
    }
}

// ── Input resolution ───────────────────────────────────────────────────────

export type InputKind = 'eth-address' | 'solana-address' | 'ens' | 'opensea-username';

export function classifyInput(raw: string): InputKind {
    const s = raw.trim();
    if (isEthAddress(s)) return 'eth-address';
    if (isSolanaAddress(s)) return 'solana-address';
    if (isEnsName(s)) return 'ens';
    return 'opensea-username';
}

/**
 * Resolves any supported input (address, ENS, OpenSea username) to a wallet address.
 * Returns { address, chain, error? } where chain hints which networks to query.
 */
export async function resolveInput(raw: string): Promise<{
    address: string | null;
    addressKind: 'evm' | 'solana' | null;
    error?: string;
}> {
    const s = raw.trim();
    const kind = classifyInput(s);

    if (kind === 'eth-address') {
        return { address: s, addressKind: 'evm' };
    }

    if (kind === 'solana-address') {
        return { address: s, addressKind: 'solana' };
    }

    if (kind === 'ens') {
        const address = await resolveEnsName(s);
        if (!address) return { address: null, addressKind: null, error: `Could not resolve "${s}". The name may not be registered.` };
        return { address, addressKind: 'evm' };
    }

    // OpenSea username
    const { address, error } = await resolveOpenSeaUsername(s);
    if (error === 'no-key') {
        return {
            address: null,
            addressKind: null,
            error: 'An OpenSea API key is required to look up usernames. Add OPENSEA_API_KEY to Replit Secrets, or paste the wallet address directly.',
        };
    }
    if (!address) return { address: null, addressKind: null, error: `OpenSea username "${s}" not found.` };
    return { address, addressKind: 'evm' };
}

// ── Alchemy multi-chain fetch ──────────────────────────────────────────────

interface AlchemyNftImage { cachedUrl?: string; thumbnailUrl?: string; originalUrl?: string; }
interface AlchemyNftContract { address: string; name?: string; symbol?: string; }
interface AlchemyOwnedNft { contract: AlchemyNftContract; tokenId: string; name?: string; image?: AlchemyNftImage; }
interface AlchemyGetNftsResponse { ownedNfts: AlchemyOwnedNft[]; totalCount: number; pageKey?: string; }

function alchemyToNft(nft: AlchemyOwnedNft, chain: SupportedChain): Nft {
    const contractAddress = nft.contract?.address ?? '';
    const tokenId = nft.tokenId ?? '';
    const collection = nft.contract?.name || nft.contract?.symbol || 'Unnamed Collection';
    const name = nft.name || `${collection} #${tokenId}`;
    const imageUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || FALLBACK_IMAGE;
    return {
        id: `${chain.id}-${contractAddress}-${tokenId}`,
        name,
        collection,
        imageUrl,
        estimatedValue: 0,
        contractAddress,
        tokenId,
        chain: chain.label,
    } as Nft & { chain: string };
}

/** Fetch NFTs from Alchemy for one EVM chain. Returns [] on error (non-throwing). */
async function fetchAlchemyChain(address: string, chain: SupportedChain, apiKey: string): Promise<Nft[]> {
    if (!chain.alchemyNetwork) return [];
    const url = new URL(`https://${chain.alchemyNetwork}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`);
    url.searchParams.set('owner', address);
    url.searchParams.set('withMetadata', 'true');
    url.searchParams.set('pageSize', '100');

    try {
        const res = await fetch(url.toString());
        if (!res.ok) {
            console.warn(`Alchemy ${chain.label} returned ${res.status}`);
            return [];
        }
        const data: AlchemyGetNftsResponse = await res.json();
        return (data.ownedNfts ?? []).map(n => alchemyToNft(n, chain));
    } catch (err) {
        console.warn(`Alchemy ${chain.label} fetch failed:`, err);
        return [];
    }
}

/**
 * Fetch NFTs from Alchemy across all selected EVM chains in parallel.
 * Returns merged, de-duplicated results.
 */
export async function fetchNftsFromAlchemy(
    address: string,
    selectedChains: SupportedChain[],
): Promise<Nft[]> {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) return [];

    const evmChains = selectedChains.filter(c => c.alchemyNetwork);
    const results = await Promise.all(evmChains.map(chain => fetchAlchemyChain(address, chain, apiKey)));
    const flat = results.flat();
    // De-duplicate by id
    const seen = new Set<string>();
    return flat.filter(nft => {
        if (seen.has(String(nft.id))) return false;
        seen.add(String(nft.id));
        return true;
    });
}

// ── OpenSea API fetch ──────────────────────────────────────────────────────

interface OpenSeaNft {
    identifier: string;
    collection: string;
    contract: string;
    token_standard: string;
    name?: string;
    image_url?: string;
    display_image_url?: string;
}

interface OpenSeaNftsResponse {
    nfts: OpenSeaNft[];
    next?: string;
}

function openSeaToNft(nft: OpenSeaNft, chainLabel: string): Nft {
    return {
        id: `opensea-${chainLabel.toLowerCase()}-${nft.contract}-${nft.identifier}`,
        name: nft.name || `${nft.collection} #${nft.identifier}`,
        collection: nft.collection,
        imageUrl: nft.display_image_url || nft.image_url || FALLBACK_IMAGE,
        estimatedValue: 0,
        contractAddress: nft.contract,
        tokenId: nft.identifier,
        chain: chainLabel,
    } as Nft & { chain: string };
}

/**
 * Fetch NFTs from OpenSea API v2 for one chain.
 * Paginates up to 3 pages (300 NFTs) to avoid runaway requests.
 */
export async function fetchNftsFromOpenSea(
    address: string,
    selectedChains: SupportedChain[],
): Promise<Nft[]> {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) return [];

    const results: Nft[] = [];
    const MAX_PAGES = 3;

    await Promise.all(
        selectedChains.map(async (chain) => {
            let next: string | undefined;
            let page = 0;
            do {
                const url = new URL(
                    `https://api.opensea.io/api/v2/chain/${chain.id}/account/${address}/nfts`
                );
                url.searchParams.set('limit', '100');
                if (next) url.searchParams.set('next', next);

                try {
                    const res = await fetch(url.toString(), {
                        headers: { 'x-api-key': apiKey, 'accept': 'application/json' },
                    });
                    if (!res.ok) break;
                    const data: OpenSeaNftsResponse = await res.json();
                    results.push(...(data.nfts ?? []).map(n => openSeaToNft(n, chain.label)));
                    next = data.next;
                    page++;
                } catch {
                    break;
                }
            } while (next && page < MAX_PAGES);
        })
    );

    // De-duplicate
    const seen = new Set<string>();
    return results.filter(nft => {
        if (seen.has(String(nft.id))) return false;
        seen.add(String(nft.id));
        return true;
    });
}
