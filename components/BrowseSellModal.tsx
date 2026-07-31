/**
 * BrowseSellModal
 *
 * A modal that wraps the Sell-to-Shop flow with an NFT pre-filled from
 * the Browse Wallet or My Portfolio grid. Skips the manual address/tokenId
 * form and jumps straight to the Gemini appraisal step.
 */
import React, { useState } from 'react';
import { getNftAppraisal } from '../services/geminiService';
import { useAppContext } from '../contexts/AppContext';
import { NFT_MARKETPLACES, NFT_CATEGORIES } from '../constants';
import type { Nft, NftAppraisal } from '../types';
import { type AlchemyNetwork, CHAIN_TO_ALCHEMY_NETWORK } from '../services/nftService';
import { toast } from 'sonner';

const SHOP_BUY_MULTIPLIER = 0.6;

interface Props {
    nft: Nft & { chain?: string };
    onClose: () => void;
}

const BrowseSellModal: React.FC<Props> = ({ nft, onClose }) => {
    const { sellNftToShop, isConnected } = useAppContext();
    const [category, setCategory] = useState(NFT_CATEGORIES[0].name);
    const [isAppraising, setIsAppraising] = useState(false);
    const [isSelling, setIsSelling] = useState(false);
    const [appraisal, setAppraisal] = useState<NftAppraisal | null>(null);
    const [error, setError] = useState<string | null>(null);

    const offerPrice = appraisal ? Math.round(appraisal.estimatedValueUSD * SHOP_BUY_MULTIPLIER) : 0;

    // Derive the Alchemy network from the NFT id prefix (format: "<network>-<contractAddress>-<tokenId>").
    const networkFromId: AlchemyNetwork | undefined = (() => {
        const known = Object.values(CHAIN_TO_ALCHEMY_NETWORK) as AlchemyNetwork[];
        return known.find(n => nft.id.startsWith(n + '-'));
    })();

    const handleAppraise = async () => {
        if (!nft.contractAddress || !nft.tokenId) {
            setError('This NFT is missing contract address or token ID — appraisal not possible.');
            return;
        }
        setIsAppraising(true);
        setError(null);
        try {
            const result = await getNftAppraisal({
                contractAddress: nft.contractAddress,
                tokenId: nft.tokenId,
                market: NFT_MARKETPLACES[0].name,
                network: networkFromId,
            });
            setAppraisal(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Appraisal failed.');
        } finally {
            setIsAppraising(false);
        }
    };

    const handleSell = async () => {
        if (!appraisal || !isConnected) return;
        setIsSelling(true);
        try {
            await sellNftToShop(
                {
                    name: nft.name,
                    collection: nft.collection,
                    imageUrl: nft.imageUrl,
                    category,
                },
                offerPrice,
            );
            onClose();
        } catch {
            toast.error('Sale failed. Please try again.');
        } finally {
            setIsSelling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative bg-brand-navy rounded-2xl border border-yellow-900/40 shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-yellow-900/30">
                    <h2 className="text-lg font-bold text-white">Sell to Shop</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>

                {/* NFT preview */}
                <div className="flex items-center gap-4 p-6 border-b border-yellow-900/20">
                    <img
                        src={nft.imageUrl}
                        alt={nft.name}
                        className="w-20 h-20 rounded-lg object-cover border border-yellow-900/30 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80/1a1a2e/d4af37?text=NFT'; }}
                    />
                    <div className="min-w-0">
                        <p className="text-xs text-gray-400 truncate">{nft.collection}</p>
                        <p className="font-semibold text-white truncate">{nft.name}</p>
                        {nft.chain && <span className="text-xs text-gray-500">{nft.chain}</span>}
                        <p className="font-mono text-xs text-gray-500 truncate mt-0.5">
                            {nft.contractAddress ? `${nft.contractAddress.slice(0, 8)}…` : 'No contract'} #{nft.tokenId}
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
                        >
                            {NFT_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>

                    {!isConnected && (
                        <div className="p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-md text-center">
                            <p className="text-yellow-300 text-sm">Sign in to sell items to the shop.</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-center">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {!appraisal ? (
                        <button
                            onClick={handleAppraise}
                            disabled={isAppraising || !isConnected}
                            className="w-full btn-metallic-gold py-3 rounded-lg font-bold disabled:!bg-gray-700 disabled:!text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:[animation:none]"
                        >
                            {isAppraising ? 'Appraising with AI…' : 'Get AI Appraisal'}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center p-4 bg-brand-dark/60 rounded-lg border border-yellow-900/20">
                                <p className="text-xs text-gray-400 mb-1">Estimated Market Value</p>
                                <p className="text-2xl font-bold text-white">${appraisal.estimatedValueUSD.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 mt-1">Confidence: {appraisal.confidenceScore}%</p>
                            </div>

                            <div className="p-4 bg-gradient-to-r from-brand-gold/20 to-brand-gold-dark/20 border border-brand-gold/20 rounded-lg text-center">
                                <p className="text-sm text-gray-300">Our Cash Offer (60% of market)</p>
                                <p className="text-3xl font-extrabold text-white my-1">${offerPrice.toLocaleString()}</p>
                                <p className="text-xs text-gray-400 mb-3">Instant store credit · no loan required</p>
                                <button
                                    onClick={handleSell}
                                    disabled={isSelling || !isConnected}
                                    className="bg-brand-gold text-brand-dark font-bold py-2 px-8 rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50"
                                >
                                    {isSelling ? 'Selling…' : 'Accept & Sell Now'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrowseSellModal;
