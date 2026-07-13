import type { Nft } from '../types';

// Real on-chain NFT data via Alchemy's NFT API, scoped to Base Sepolia
// (the same testnet used for wallet connect / escrow). Replaces the old
// Gemini-hallucinated placeholder data — see Phase 2 of the Web3 rebuild.
const ALCHEMY_NETWORK = 'base-sepolia';

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

export const fetchNftsForWallet = async (walletAddress: string): Promise<Nft[]> => {
    const apiKey = process.env.ALCHEMY_API_KEY;

    if (!apiKey) {
        throw new Error('NFT indexing isn\'t configured yet (missing Alchemy API key). Ask the project owner to add it.');
    }

    const url = new URL(`https://${ALCHEMY_NETWORK}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`);
    url.searchParams.set('owner', walletAddress);
    url.searchParams.set('withMetadata', 'true');
    url.searchParams.set('pageSize', '100');

    let response: Response;
    try {
        response = await fetch(url.toString());
    } catch (error) {
        console.error('Network error calling Alchemy NFT API:', error);
        throw new Error('Could not reach the NFT indexing service. Check your connection and try again.');
    }

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('Alchemy NFT API error:', response.status, body);
        throw new Error(`Failed to fetch NFT portfolio (status ${response.status}). The indexing service may be unavailable.`);
    }

    const data: AlchemyGetNftsForOwnerResponse = await response.json();

    return (data.ownedNfts ?? []).map((nft): Nft => {
        const contractAddress = nft.contract?.address ?? '';
        const tokenId = nft.tokenId ?? '';
        const collection = nft.contract?.name || nft.contract?.symbol || 'Unnamed Collection';
        const name = nft.name || `${collection} #${tokenId}`;
        const imageUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || FALLBACK_IMAGE;

        return {
            id: `${contractAddress}-${tokenId}`,
            name,
            collection,
            imageUrl,
            // Real on-chain ownership is confirmed by Alchemy above; USD value is
            // deliberately left at 0 here — actual appraisals come from the
            // separate Quick Appraise flow (services/geminiService.ts), never
            // fabricated as part of the wallet listing itself.
            estimatedValue: 0,
            contractAddress,
            tokenId,
        };
    });
};
