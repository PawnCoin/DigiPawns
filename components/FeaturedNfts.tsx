import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import type { Collection } from '../types';

const TRANSFER_LABEL: Record<string, { label: string; color: string }> = {
    awaiting_transfer: { label: '⏳ Awaiting Transfer', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30' },
    received:          { label: '📬 NFT Received', color: 'text-blue-400 bg-blue-400/10 border-blue-500/30' },
    active:            { label: '✅ Loan Active', color: 'text-green-400 bg-green-400/10 border-green-500/30' },
    returned:          { label: '🔄 NFT Returned', color: 'text-purple-400 bg-purple-400/10 border-purple-500/30' },
    liquidated:        { label: '🔴 Liquidated', color: 'text-red-400 bg-red-400/10 border-red-500/30' },
};

const CollectionCard: React.FC<{ col: Collection }> = ({ col }) => (
    <div className="flex-shrink-0 w-72 bg-brand-navy/80 backdrop-blur-lg border border-yellow-900/30 rounded-2xl overflow-hidden m-4
                    hover:border-brand-gold/50 hover:scale-105 hover:shadow-gold-glow transition-all duration-300">
        <div className="h-44 bg-brand-dark/60 relative overflow-hidden">
            {col.imageUrl ? (
                <img src={col.imageUrl} alt={col.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">🖼️</div>
            )}
            {col.verified && (
                <span className="absolute top-2 right-2 bg-brand-gold text-brand-dark text-[10px] font-black px-2 py-0.5 rounded-full">✓ VERIFIED</span>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-brand-navy to-transparent" />
        </div>
        <div className="p-5">
            <h4 className="font-bold text-lg text-white truncate">{col.name}</h4>
            <p className="text-sm text-gray-400 truncate mt-0.5">{col.description}</p>
            <div className="flex items-center justify-between mt-4">
                <div>
                    <p className="text-xs text-gray-500">Floor Price</p>
                    <p className="font-bold text-brand-gold">{col.floorPrice} {col.currency}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Chain</p>
                    <p className="text-sm text-gray-300">{col.chain}</p>
                </div>
            </div>
            {col.website && (
                <a href={col.website} target="_blank" rel="noopener noreferrer"
                    className="mt-3 block text-center text-xs text-brand-gold/70 hover:text-brand-gold border border-brand-gold/20 hover:border-brand-gold/40 rounded-lg py-1.5 transition-colors">
                    View Collection →
                </a>
            )}
        </div>
    </div>
);

const PLACEHOLDER_COLLECTIONS: Collection[] = [
    { id: 'p1', name: 'Bored Ape Yacht Club', description: 'The most iconic NFT collection on Ethereum — 10,000 unique apes.', imageUrl: 'https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGf6xWd4?auto=format&dpr=1&w=384', chain: 'Ethereum', floorPrice: 12.5, currency: 'ETH', totalItems: 10000, verified: true, website: 'https://boredapeyachtclub.com' },
    { id: 'p2', name: 'CryptoPunks', description: '10,000 unique collectible characters — the original NFT project.', imageUrl: 'https://i.seadn.io/gae/BdxvLseXcfl57BiuQcQYdJ64v-aI8din7WPk0Pgo3qQFhAUH-B6i-dCqqc_mCkRIzULmwzwecnohLhrcH8A9mpWIZqA7ygc52Sr81hE?auto=format&dpr=1&w=384', chain: 'Ethereum', floorPrice: 45.0, currency: 'ETH', totalItems: 10000, verified: true, website: 'https://cryptopunks.app' },
    { id: 'p3', name: 'Azuki', description: 'A brand for the metaverse built by the community for the community.', imageUrl: 'https://i.seadn.io/gae/H8jOCJuQokNqGBpkBN5wk1oZwO7LM8bNnrHCaekV2nKjnCqw6UB5oaH8XyNeBDj6Crun_MXNwyd_AVJM?auto=format&dpr=1&w=384', chain: 'Ethereum', floorPrice: 5.8, currency: 'ETH', totalItems: 10000, verified: true, website: 'https://www.azuki.com' },
    { id: 'p4', name: 'DeGods', description: 'A collection of degenerates, punks, and misfits doing degenerate things.', imageUrl: 'https://i.seadn.io/gcs/files/b57f5ef3d4f0cfc0ee64f9393d46d23e.png?auto=format&dpr=1&w=384', chain: 'Solana', floorPrice: 290, currency: 'SOL', totalItems: 10000, verified: true, website: 'https://degods.com' },
    { id: 'p5', name: 'Pudgy Penguins', description: 'A collection of 8,888 cute and cuddly penguins taking over the metaverse.', imageUrl: 'https://i.seadn.io/gae/yNi-XdGxsgQCPpqSio4o31ygAV6wURdIdInWRcFIl46UjUQ1eV7BEndGe8L661LC2NfWS9Hox5yt0ai4ey73Cz5QI3rOPTdQs3Kd?auto=format&dpr=1&w=384', chain: 'Ethereum', floorPrice: 8.2, currency: 'ETH', totalItems: 8888, verified: true, website: 'https://www.pudgypenguins.com' },
    { id: 'p6', name: 'Milady Maker', description: '10,000 generative profile picture NFTs in an aesthetic neochibi style.', imageUrl: 'https://i.seadn.io/gcs/files/6da8742c1fd04b4a0bbdbf50a41a6b64.jpg?auto=format&dpr=1&w=384', chain: 'Ethereum', floorPrice: 3.1, currency: 'ETH', totalItems: 10000, verified: true, website: 'https://miladymaker.net' },
];

const FeaturedNfts: React.FC = () => {
    const { collections } = useAppContext();

    const displayCollections = collections.length > 0 ? collections : PLACEHOLDER_COLLECTIONS;
    const row1 = displayCollections.slice(0, Math.ceil(displayCollections.length / 2));
    const row2 = displayCollections.slice(Math.ceil(displayCollections.length / 2));
    const row2Display = row2.length > 0 ? row2 : row1;

    return (
        <section id="collections" className="py-20 sm:py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-gray-700/20 [mask-image:linear-gradient(to_bottom,white_5%,transparent_50%)] -z-10"></div>
            <div className="max-w-7xl mx-auto text-center px-4 mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    {collections.length > 0 ? 'Curated' : 'Featured'} <span className="text-brand-gold">NFT Collections</span>
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    {collections.length > 0
                        ? 'Hand-picked collections accepted as collateral at DigiPawns.'
                        : 'Popular NFT collections accepted as loan collateral. Admin can curate this list.'}
                </p>
            </div>

            <div className="flex flex-col space-y-6 overflow-hidden">
                {/* Row 1 — left scroll */}
                <div className="flex overflow-hidden">
                    <div className="animate-marquee flex-shrink-0 flex">
                        {[...row1, ...row1].map((col, i) => <CollectionCard key={`r1-${col.id}-${i}`} col={col} />)}
                    </div>
                </div>
                {/* Row 2 — right scroll */}
                <div className="flex overflow-hidden">
                    <div className="animate-marquee-reverse flex-shrink-0 flex">
                        {[...row2Display, ...row2Display].map((col, i) => <CollectionCard key={`r2-${col.id}-${i}`} col={col} />)}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeaturedNfts;
