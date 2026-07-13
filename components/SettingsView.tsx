import React, { useState, useEffect, useCallback } from 'react';
import { WalletIcon } from './IconComponents';
import type { Nft } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { fetchNftsForWallet } from '../services/nftService';

const NftGridItem: React.FC<{ nft: Nft; onAppraise: () => void }> = ({ nft, onAppraise }) => (
    <div className="bg-brand-dark/60 rounded-lg overflow-hidden border border-yellow-900/30 group transition-all duration-300 hover:border-brand-gold/60 hover:shadow-lg">
        <div className="w-full h-40 bg-brand-dark relative">
            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-3">
            <p className="text-xs text-gray-400 truncate">{nft.collection}</p>
            <h4 className="font-semibold text-white truncate">{nft.name}</h4>
        </div>
        <button onClick={onAppraise} className="w-full bg-brand-gold-dark/80 text-white font-bold text-sm py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Quick Appraise
        </button>
    </div>
);

const NftGridSkeleton: React.FC = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
             <div key={i} className="bg-brand-dark/60 rounded-lg overflow-hidden border border-yellow-900/20 animate-pulse">
                <div className="w-full h-40 bg-brand-navy"></div>
                <div className="p-3">
                    <div className="h-2 bg-brand-navy rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-brand-navy rounded w-1/2"></div>
                </div>
            </div>
        ))}
    </div>
);


const SettingsView: React.FC = () => {
    const { navigate, walletAddress, isWalletConnected, isConnectingWallet, isCorrectChain, chainName, connectRealWallet, disconnectChainWallet } = useAppContext();

    const [portfolio, setPortfolio] = useState<{ nfts: Nft[], isLoading: boolean, error: string | null }>({
        nfts: [],
        isLoading: true,
        error: null,
    });

    const [searchTerm, setSearchTerm] = useState('');

    const loadNftsForWallet = useCallback(async (address: string | null) => {
        if (!address) return;
        setPortfolio({ nfts: [], isLoading: true, error: null });
        try {
            const fetchedNfts = await fetchNftsForWallet(address);
            setPortfolio({ nfts: fetchedNfts, isLoading: false, error: null });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setPortfolio({ nfts: [], isLoading: false, error: errorMessage });
        }
    }, []);

    useEffect(() => {
        loadNftsForWallet(walletAddress);
    }, [walletAddress, loadNftsForWallet]);

    const filteredNfts = portfolio.nfts.filter(nft =>
        nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.collection.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAppraiseClick = (nft: Nft) => {
        navigate('/');
        setTimeout(() => {
            const contractInput = document.getElementById('contractAddress') as HTMLInputElement;
            const tokenInput = document.getElementById('tokenId') as HTMLInputElement;
            const appraiseSection = document.getElementById('appraise');

            if (contractInput && tokenInput) {
                contractInput.value = nft.contractAddress;
                tokenInput.value = nft.tokenId;
                const event = new Event('input', { bubbles: true });
                contractInput.dispatchEvent(event);
                tokenInput.dispatchEvent(event);
            }

            if (appraiseSection) {
                const headerOffset = 80;
                const elementPosition = appraiseSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        }, 100);
    };

    const renderPortfolioContent = () => {
        if (!walletAddress) {
             return <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40"><p className="text-gray-400">Connect a wallet to view your assets.</p></div>
        }
        if (portfolio.isLoading) {
            return <NftGridSkeleton />;
        }
        if (portfolio.error) {
            return (
                 <div className="text-center py-16 bg-red-900/20 rounded-lg border border-dashed border-red-700/50">
                    <p className="text-red-300">Could not load portfolio.</p>
                    <p className="text-sm text-red-400 mt-1">{portfolio.error}</p>
                </div>
            );
        }
        if (portfolio.nfts.length === 0) {
            return (
                <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40">
                    <p className="text-gray-400">No NFTs found in this wallet.</p>
                </div>
            );
        }
        if (filteredNfts.length === 0) {
            return (
                <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40">
                    <p className="text-gray-400">No assets found matching "{searchTerm}".</p>
                    <p className="text-sm text-gray-500 mt-1">Try a different search term or clear the filter.</p>
                </div>
            );
        }
        return (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredNfts.map(nft => <NftGridItem key={nft.id} nft={nft} onAppraise={() => handleAppraiseClick(nft)} />)}
            </div>
        )
    };

    const shortenAddress = (address: string) => `${address.substring(0,6)}...${address.substring(address.length - 4)}`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-brand-navy p-6 rounded-lg border border-yellow-900/40 h-fit">
                <h3 className="font-semibold text-lg text-white mb-4">Connected Wallet</h3>
                <p className="text-xs text-gray-500 mb-4">
                    This links a real wallet on {chainName} (testnet) — no manual address entry, so what you see here always reflects an actual on-chain connection.
                </p>
                {isWalletConnected && walletAddress ? (
                    <div className="space-y-3">
                        <div className={`w-full p-3 rounded-md ${isCorrectChain ? 'bg-green-900/20 border border-green-700/40' : 'bg-red-900/20 border border-red-700/40'}`}>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-sm text-brand-gold">{shortenAddress(walletAddress)}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isCorrectChain ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {isCorrectChain ? chainName : 'Wrong Network'}
                                </span>
                            </div>
                            {!isCorrectChain && (
                                <p className="text-xs text-red-400 mt-2">Switch your wallet to {chainName} to use this connection.</p>
                            )}
                        </div>
                        <button onClick={disconnectChainWallet} className="w-full text-sm text-gray-400 hover:text-red-400 border border-yellow-900/30 hover:border-red-700/40 rounded-md py-2 transition-colors">
                            Disconnect Wallet
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={connectRealWallet}
                        disabled={isConnectingWallet}
                        className="w-full flex items-center justify-center space-x-2 text-brand-gold border-2 border-dashed border-yellow-900/40 hover:border-brand-gold/60 hover:bg-brand-gold/10 rounded-lg py-3 transition-colors disabled:opacity-50"
                    >
                        <WalletIcon className="w-5 h-5" />
                        <span>{isConnectingWallet ? 'Connecting…' : 'Connect Wallet'}</span>
                    </button>
                )}
            </div>
            <div className="lg:col-span-2">
                {walletAddress && (
                    <div className="mb-3 text-xs text-yellow-500/80 bg-yellow-900/10 border border-yellow-900/30 rounded-md px-3 py-2">
                        Wallet connection above is real. This NFT list is still simulated (AI-generated) — real on-chain NFT indexing is a planned next phase.
                    </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <h3 className="font-semibold text-lg text-white mb-2 sm:mb-0">Assets in <span className="font-mono text-brand-gold">{walletAddress ? shortenAddress(walletAddress) : 'No Wallet Connected'}</span></h3>
                    <div className="w-full sm:w-auto">
                         <input
                            type="text"
                            placeholder="Filter by name or collection..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 bg-brand-dark border border-yellow-900/40 rounded-lg py-1.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/60 transition text-white placeholder-gray-600"
                        />
                    </div>
                </div>
                {renderPortfolioContent()}
            </div>
        </div>
    );
};

export default SettingsView;
