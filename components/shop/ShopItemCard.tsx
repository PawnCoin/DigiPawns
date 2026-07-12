import React from 'react';
import type { ShopItem } from '../../types';

const SOURCE_LABELS: Record<string, string> = {
    liquidated: 'Forfeited Loan',
    admin: 'Shop Pick',
    'user-sold': 'Sold In',
    'trade-in': 'Traded In',
};

interface ShopItemCardProps {
    item: ShopItem;
    onBuy?: () => void;
    onTrade?: () => void;
    disabled?: boolean;
}

/**
 * A single item "on display" in the shop floor — styled like it's sitting in a glass display case
 * under a spotlight, with a hanging price tag, rather than a generic marketplace card.
 */
const ShopItemCard: React.FC<ShopItemCardProps> = ({ item, onBuy, onTrade, disabled }) => (
    <div className="group relative bg-gradient-to-b from-brand-navy to-brand-dark rounded-2xl border border-yellow-900/30 hover:border-brand-gold/60 transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-gold-glow">
        {/* "glass case" frame */}
        <div className="relative h-48 bg-brand-dark/60 overflow-hidden border-b border-yellow-900/20">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/5 pointer-events-none z-10" />
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <span className="absolute top-2 left-2 z-20 text-[10px] font-bold uppercase tracking-wide bg-black/60 text-brand-gold-light px-2 py-1 rounded-full border border-brand-gold/30">
                {SOURCE_LABELS[item.source] || 'On Display'}
            </span>
        </div>

        {/* hanging price tag */}
        <div className="absolute top-44 right-3 z-20 bg-brand-gold text-brand-dark text-xs font-black px-3 py-1.5 rounded-md shadow-lg rotate-2 border border-yellow-700/40">
            ${item.price.toLocaleString()}
        </div>

        <div className="p-4">
            <p className="text-xs text-gray-400 truncate">{item.collection}</p>
            <h4 className="font-bold text-white truncate">{item.name}</h4>
            {item.sellerUsername && (
                <p className="text-[11px] text-gray-500 mt-0.5">from {item.sellerUsername}</p>
            )}
            <div className="flex gap-2 mt-3">
                {onBuy && (
                    <button
                        onClick={onBuy}
                        disabled={disabled}
                        className="flex-1 btn-metallic-gold py-2 rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:[animation:none]"
                    >
                        Buy Now
                    </button>
                )}
                {onTrade && (
                    <button
                        onClick={onTrade}
                        disabled={disabled}
                        className="flex-1 border border-yellow-900/40 text-gray-300 hover:text-brand-gold hover:border-brand-gold/50 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Trade For
                    </button>
                )}
            </div>
        </div>
    </div>
);

export default ShopItemCard;
