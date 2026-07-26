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
