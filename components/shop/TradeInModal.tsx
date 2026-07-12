import React, { useState } from 'react';
import type { ShopItem } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { NFT_CATEGORIES } from '../../constants';
import { toast } from 'sonner';

interface TradeInModalProps {
    item: ShopItem;
    onClose: () => void;
}

/**
 * Trade-in flow: user offers one of their own NFTs (from wallet portfolio or owned items)
 * straight-up for a shop-floor item, no cash involved — like handing over an old item at the counter.
 */
const TradeInModal: React.FC<TradeInModalProps> = ({ item, onClose }) => {
    const { tradeInForItem, ownedItems, walletAddress } = useAppContext();
    const [name, setName] = useState('');
    const [collectionName, setCollectionName] = useState('');
    const [category, setCategory] = useState(NFT_CATEGORIES[0].name);
    const [selectedOwnedId, setSelectedOwnedId] = useState<string | null>(null);
    const [isTrading, setIsTrading] = useState(false);

    const handleTrade = async () => {
        const offered = selectedOwnedId
            ? ownedItems.find(i => i.id === selectedOwnedId)
            : null;

        const offeredNft = offered
            ? { name: offered.name, collection: offered.collection, imageUrl: offered.imageUrl, category: offered.category }
            : { name: name || 'Unnamed NFT', collection: collectionName || 'Unknown Collection', imageUrl: `https://picsum.photos/seed/trade${Date.now()}/400`, category };

        if (!offered && !name.trim()) { toast.error('Enter the item you want to trade in, or pick one from your collection.'); return; }

        setIsTrading(true);
        try {
            await tradeInForItem(item.id, offeredNft);
            onClose();
        } finally {
            setIsTrading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-navy border border-brand-gold/40 rounded-2xl p-6 max-w-lg w-full">
                <h3 className="text-xl font-bold text-white mb-1">Trade In For {item.name}</h3>
                <p className="text-gray-400 text-sm mb-6">Offer an item straight across — no cash needed. The counter appraises it as an even swap.</p>

                <div className="flex items-center gap-4 mb-6 p-3 bg-brand-dark/50 rounded-lg border border-yellow-900/30">
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                    <div>
                        <p className="text-white font-semibold">{item.name}</p>
                        <p className="text-gray-400 text-xs">{item.collection}</p>
                        <p className="text-brand-gold text-sm font-bold">${item.price.toLocaleString()} value</p>
                    </div>
                </div>

                {ownedItems.length > 0 && (
                    <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-2">Trade from your collection</label>
                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                            {ownedItems.map(o => (
                                <button key={o.id} onClick={() => setSelectedOwnedId(o.id === selectedOwnedId ? null : o.id)}
                                    className={`rounded-lg overflow-hidden border-2 transition-colors ${selectedOwnedId === o.id ? 'border-brand-gold' : 'border-yellow-900/30 hover:border-yellow-900/60'}`}>
                                    <img src={o.imageUrl} alt={o.name} className="w-full h-16 object-cover" />
                                    <p className="text-[10px] text-gray-300 truncate px-1 py-0.5 bg-brand-dark">{o.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!selectedOwnedId && (
                    <div className="space-y-3 mb-4">
                        <p className="text-xs text-gray-500">{walletAddress ? 'Or describe an NFT from your wallet to trade in:' : 'Describe the NFT you want to trade in:'}</p>
                        <input type="text" placeholder="Item name (e.g. Bored Ape #1234)" value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-gold/60" />
                        <input type="text" placeholder="Collection name" value={collectionName} onChange={e => setCollectionName(e.target.value)}
                            className="w-full bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-gold/60" />
                        <select value={category} onChange={e => setCategory(e.target.value)}
                            className="w-full bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/60">
                            {NFT_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={handleTrade} disabled={isTrading} className="flex-1 btn-metallic-gold py-2.5 rounded-lg font-bold disabled:opacity-50">
                        {isTrading ? 'Trading...' : 'Confirm Trade'}
                    </button>
                    <button onClick={onClose} className="flex-1 bg-brand-dark border border-yellow-900/40 text-gray-300 font-bold py-2.5 rounded-lg hover:text-white transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TradeInModal;
