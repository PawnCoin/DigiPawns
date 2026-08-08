import React, { useState } from 'react';
import { getNftAppraisal } from '../../services/geminiService';
import { useAppContext } from '../../contexts/AppContext';
import { NFT_MARKETPLACES, NFT_CATEGORIES } from '../../constants';
import type { NftAppraisal } from '../../types';
import { type AlchemyNetwork } from '../../services/nftService';
import { toast } from 'sonner';

// Pawn shops buy outright for less than market value since they take on resale risk.
const SHOP_BUY_MULTIPLIER = 0.6;

const NETWORK_OPTIONS: { label: string; value: AlchemyNetwork }[] = [
    { label: 'Ethereum', value: 'eth-mainnet' },
    { label: 'Polygon', value: 'polygon-mainnet' },
    { label: 'Base', value: 'base-mainnet' },
];

const SellToShopPanel: React.FC = () => {
    const { sellNftToShop } = useAppContext();
    const [contractAddress, setContractAddress] = useState('');
    const [tokenId, setTokenId] = useState('');
    const [selectedNetwork, setSelectedNetwork] = useState<AlchemyNetwork>('eth-mainnet');
    const [category, setCategory] = useState(NFT_CATEGORIES[0].name);
    const [isLoading, setIsLoading] = useState(false);
    const [isSelling, setIsSelling] = useState(false);
    const [appraisal, setAppraisal] = useState<NftAppraisal | null>(null);
    const [error, setError] = useState<string | null>(null);

    const nftName = tokenId ? `NFT #${tokenId}` : 'Unnamed NFT';
    const nftCollection = contractAddress ? `Collection ${contractAddress.substring(0, 6)}...` : 'Unknown Collection';
    const offerPrice = appraisal ? Math.round(appraisal.estimatedValueUSD * SHOP_BUY_MULTIPLIER) : 0;

    const handleAppraise = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractAddress || !tokenId) { setError('Please provide both Contract Address and Token ID.'); return; }
        setIsLoading(true);
        setError(null);
        setAppraisal(null);
        try {
            const result = await getNftAppraisal({ contractAddress, tokenId, market: NFT_MARKETPLACES[0].name, network: selectedNetwork });
            setAppraisal(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSell = async () => {
        if (!appraisal) return;
        setIsSelling(true);
        try {
            await sellNftToShop(
                { name: nftName, collection: nftCollection, imageUrl: `https://picsum.photos/seed/${contractAddress}${tokenId}/400`, category },
                offerPrice
            );
            setAppraisal(null);
            setContractAddress('');
            setTokenId('');
        } catch {
            toast.error('Sale failed.');
        } finally {
            setIsSelling(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-brand-navy p-8 rounded-2xl border border-yellow-900/40 shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-2">Sell an Item Outright</h2>
            <p className="text-center text-gray-400 mb-8">No loan, no waiting — get instant cash for your digital asset. We appraise it, you get paid.</p>

            <form onSubmit={handleAppraise}>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chain</label>
                    <div className="flex gap-3">
                        {NETWORK_OPTIONS.map(opt => (
                            <button
                                type="button"
                                key={opt.value}
                                onClick={() => setSelectedNetwork(opt.value)}
                                className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-all duration-200 ${selectedNetwork === opt.value ? 'border-brand-gold text-brand-gold bg-brand-gold/10' : 'border-yellow-900/30 text-gray-400 hover:border-yellow-900/60'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Contract Address</label>
                        <input type="text" value={contractAddress} onChange={e => setContractAddress(e.target.value)}
                            className="w-full bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-gold/60 text-white placeholder-gray-600" placeholder="0x..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Token ID</label>
                        <input type="text" value={tokenId} onChange={e => setTokenId(e.target.value)}
                            className="w-full bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-gold/60 text-white placeholder-gray-600" placeholder="1234" />
                    </div>
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-gold/60 text-white">
                        {NFT_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <button type="submit" disabled={isLoading} className="w-full btn-metallic-gold py-3 px-6 rounded-lg text-lg disabled:!bg-gray-600 disabled:!text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:[animation:none]">
                    {isLoading ? 'Appraising...' : 'Get a Sell Offer'}
                </button>
            </form>

            {error && <div className="mt-6 p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-center">{error}</div>}

            {appraisal && (
                <div className="mt-8 pt-6 border-t border-yellow-900/30 text-center">
                    <p className="text-sm text-gray-400">Estimated Market Value</p>
                    <p className="text-2xl font-bold text-white mb-4">${appraisal.estimatedValueUSD.toLocaleString()}</p>
                    <div className="p-6 bg-gradient-to-r from-brand-gold/20 to-brand-gold-dark/20 border border-brand-gold/20 rounded-lg">
                        <p className="text-lg text-gray-200">Our Cash Offer</p>
                        <p className="text-4xl font-extrabold text-white my-2">${offerPrice.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mb-4">Instant store credit, no loan or repayment required.</p>
                        <button onClick={handleSell} disabled={isSelling} className="bg-brand-gold text-brand-dark font-bold py-2 px-8 rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50">
                            {isSelling ? 'Selling...' : 'Accept & Sell Now'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellToShopPanel;
