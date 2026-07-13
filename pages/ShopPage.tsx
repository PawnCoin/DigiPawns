import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAppContext } from '../contexts/AppContext';
import { PLACEHOLDER_SHOP_ITEMS } from '../mock-data';
import { NFT_CATEGORIES } from '../constants';
import ShopItemCard from '../components/shop/ShopItemCard';
import SellToShopPanel from '../components/shop/SellToShopPanel';
import TradeInModal from '../components/shop/TradeInModal';
import type { ShopItem } from '../types';

type ShopTab = 'browse' | 'sell' | 'collection';

const ShopPage: React.FC = () => {
    const { isConnected, connectWallet, shopInventory, ownedItems, profile, buyShopItem } = useAppContext();
    const [tab, setTab] = useState<ShopTab>('browse');
    const [category, setCategory] = useState<string>('All');
    const [search, setSearch] = useState('');
    const [tradeItem, setTradeItem] = useState<ShopItem | null>(null);
    const [buyingId, setBuyingId] = useState<string | null>(null);

    // The shop floor always shows something to browse, even before any real listings exist —
    // same fallback convention used for the homepage's featured collections.
    const usingPlaceholders = shopInventory.length === 0;
    const displayItems = usingPlaceholders ? PLACEHOLDER_SHOP_ITEMS : shopInventory;

    const filteredItems = useMemo(() => {
        return displayItems.filter(item => {
            const matchesCategory = category === 'All' || item.category === category;
            const matchesSearch = !search ||
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.collection.toLowerCase().includes(search.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [displayItems, category, search]);

    const PLACEHOLDER_MSG = 'This is a sample listing. Real inventory appears when loans are forfeited or admins add items.';

    const handleBuy = async (item: ShopItem) => {
        if (!isConnected) { connectWallet(); return; }
        if (usingPlaceholders) { toast.info(PLACEHOLDER_MSG); return; }
        setBuyingId(item.id);
        try { await buyShopItem(item.id); } finally { setBuyingId(null); }
    };

    const handleTrade = (item: ShopItem) => {
        if (!isConnected) { connectWallet(); return; }
        if (usingPlaceholders) { toast.info(PLACEHOLDER_MSG); return; }
        setTradeItem(item);
    };

    const TabBtn: React.FC<{ id: ShopTab; label: string; count?: number }> = ({ id, label, count }) => (
        <button onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${tab === id ? 'btn-metallic-gold' : 'text-gray-400 hover:text-white hover:bg-brand-navy border border-transparent hover:border-yellow-900/40'}`}>
            {label}
            {count != null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-black/20 text-brand-dark' : 'bg-brand-navy text-gray-400'}`}>{count}</span>
            )}
        </button>
    );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Storefront header — sets the "walking onto the shop floor" feel */}
                <div className="relative rounded-2xl overflow-hidden mb-10 border border-yellow-900/40 bg-gradient-to-br from-brand-navy via-brand-dark to-brand-navy">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.5),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(212,160,23,0.3),transparent_45%)]" />
                    <div className="relative z-10 px-6 sm:px-10 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <span className="text-xs font-bold tracking-widest uppercase text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-3 py-1 rounded-full">The Shop Floor</span>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white mt-3">Step Inside DigiPawns</h1>
                            <p className="text-gray-400 mt-2 max-w-xl">Every case on this floor holds a real listing — forfeited loans, trade-ins, and shop picks, all up for grabs.</p>
                        </div>
                        <div className="bg-brand-dark/60 border border-yellow-900/40 rounded-xl px-6 py-4 text-center min-w-[180px]">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Store Credit</p>
                            <p className="text-2xl font-black text-brand-gold mt-1">${(profile.balance ?? 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 border-b border-yellow-900/30 pb-4">
                    <nav className="flex flex-wrap gap-2" aria-label="Shop sections">
                        <TabBtn id="browse" label="Browse & Buy" count={displayItems.length} />
                        <TabBtn id="sell" label="Sell to Shop" />
                        <TabBtn id="collection" label="My Collection" count={ownedItems.length} />
                    </nav>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                        {/* ── BROWSE & BUY ── */}
                        {tab === 'browse' && (
                            <div>
                                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                    <input
                                        type="text"
                                        placeholder="Search items or collections..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="flex-1 bg-brand-dark border border-yellow-900/40 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/60 text-white placeholder-gray-600"
                                    />
                                    <div className="flex gap-2 overflow-x-auto">
                                        {['All', ...NFT_CATEGORIES.map(c => c.name)].map(cat => (
                                            <button key={cat} onClick={() => setCategory(cat)}
                                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${category === cat ? 'bg-brand-gold text-brand-dark' : 'bg-brand-dark border border-yellow-900/30 text-gray-400 hover:text-white'}`}>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {filteredItems.length === 0 ? (
                                    <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40">
                                        <p className="text-gray-400">No items match your filters.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {filteredItems.map(item => (
                                            <ShopItemCard
                                                key={item.id}
                                                item={item}
                                                disabled={buyingId === item.id}
                                                onBuy={() => handleBuy(item)}
                                                onTrade={() => handleTrade(item)}
                                            />
                                        ))}
                                    </div>
                                )}
                                {shopInventory.length === 0 && (
                                    <p className="text-center text-xs text-gray-500 mt-6">(Showing sample floor items — connect your wallet and forfeited loans or shop picks will appear here.)</p>
                                )}
                            </div>
                        )}

                        {/* ── SELL TO SHOP ── */}
                        {tab === 'sell' && (
                            isConnected ? <SellToShopPanel /> : (
                                <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40">
                                    <p className="text-gray-400 mb-4">Sign in to sell an item to the shop.</p>
                                    <button onClick={connectWallet} className="btn-metallic-gold px-6 py-2 rounded-lg">Sign In</button>
                                </div>
                            )
                        )}

                        {/* ── MY COLLECTION ── */}
                        {tab === 'collection' && (
                            isConnected ? (
                                ownedItems.length === 0 ? (
                                    <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40">
                                        <p className="text-gray-400">You haven't bought or traded for anything yet.</p>
                                        <button onClick={() => setTab('browse')} className="mt-4 text-brand-gold hover:text-brand-gold-light font-semibold">Browse the shop floor →</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {ownedItems.map(item => <ShopItemCard key={item.id} item={item} />)}
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40">
                                    <p className="text-gray-400 mb-4">Sign in to view items you own.</p>
                                    <button onClick={connectWallet} className="btn-metallic-gold px-6 py-2 rounded-lg">Sign In</button>
                                </div>
                            )
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {tradeItem && <TradeInModal item={tradeItem} onClose={() => setTradeItem(null)} />}
        </motion.div>
    );
};

export default ShopPage;
