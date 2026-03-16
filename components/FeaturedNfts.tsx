import React, { useState, useEffect } from 'react';
import { getFeaturedNfts } from '../services/geminiService';
import type { FeaturedNftCategory, FeaturedNftItem } from '../types';
import { StarIcon } from './IconComponents';

const NftCard: React.FC<{ item: FeaturedNftItem }> = ({ item }) => (
    <div className="flex-shrink-0 w-64 h-80 bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-5 m-4
                   hover:border-blue-400/50 hover:scale-105 hover:shadow-blue-glow transition-all duration-300
                   flex flex-col justify-between">
        <div>
            <div className="w-full h-40 bg-gray-700/50 rounded-lg mb-4 animate-pulse"></div>
            <h4 className="font-bold text-lg text-white truncate">{item.name}</h4>
            <p className="text-sm text-gray-400 truncate">{item.collection}</p>
        </div>
        <div>
            <p className="text-xs text-gray-500">Value</p>
            <p className="font-semibold text-xl text-blue-300">${item.estimatedValue.toLocaleString()}</p>
        </div>
    </div>
);

const MarqueeRow: React.FC<{ items: FeaturedNftItem[], reverse?: boolean }> = ({ items, reverse = false }) => (
    <div className="flex w-max">
        {items.map((item, index) => <NftCard key={`${item.name}-${index}`} item={item} />)}
    </div>
);

const FeaturedNfts: React.FC = () => {
    const [collections, setCollections] = useState<FeaturedNftCategory[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const data = await getFeaturedNfts();
                setCollections(data);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("An unknown error occurred while fetching collections.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchCollections();
    }, []);

    const firstRowNfts = collections.slice(0, 3).flatMap(c => c.nfts);
    const secondRowNfts = collections.slice(3, 6).flatMap(c => c.nfts);

    const renderSkeleton = () => (
        <div className="flex flex-col space-y-8">
            <div className="flex w-full overflow-hidden">
                <div className="flex w-max">
                    {[...Array(6)].map((_, i) => (
                         <div key={i} className="flex-shrink-0 w-64 h-80 bg-gray-800/80 rounded-2xl p-5 m-4 animate-pulse"></div>
                    ))}
                </div>
            </div>
             <div className="flex w-full overflow-hidden">
                <div className="flex w-max">
                    {[...Array(6)].map((_, i) => (
                         <div key={i} className="flex-shrink-0 w-64 h-80 bg-gray-800/80 rounded-2xl p-5 m-4 animate-pulse"></div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <section id="collections" className="py-20 sm:py-24 relative overflow-hidden">
             <div className="absolute inset-0 bg-grid-gray-700/20 [mask-image:linear-gradient(to_bottom,white_5%,transparent_50%)] -z-10"></div>
            <div className="max-w-7xl mx-auto text-center">
                 <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
                    AI-Curated <span className="text-blue-400">Featured Collections</span>
                </h2>
                <p className="text-gray-400 mb-12 max-w-2xl mx-auto">Discover trending and high-value asset collections, dynamically curated by our AI.</p>
            </div>

            {isLoading && renderSkeleton()}
            
            {error && (
                <div className="max-w-7xl mx-auto text-center p-8 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">
                    <p>Sorry, we couldn't load the featured collections at this moment.</p>
                    <p className="text-sm text-red-400 mt-2">{error}</p>
                </div>
            )}

            {!isLoading && !error && collections.length > 0 && (
                <div className="flex flex-col space-y-8">
                     <div className="flex overflow-hidden">
                        <div className="animate-marquee flex-shrink-0">
                           <MarqueeRow items={[...firstRowNfts, ...firstRowNfts]} />
                        </div>
                     </div>
                     <div className="flex overflow-hidden">
                        <div className="animate-marquee-reverse flex-shrink-0">
                            <MarqueeRow items={[...secondRowNfts, ...secondRowNfts]} reverse />
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default FeaturedNfts;