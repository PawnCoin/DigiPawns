import React, { useState, useEffect, useCallback } from 'react';
import { MOCK_LINKED_WALLETS } from '../mock-data';
import { PlusIcon, TrashIcon } from './IconComponents';
import type { Nft, LinkedWallet } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { fetchNftsForWallet } from '../services/nftService';
import { formatDistanceToNow } from 'date-fns';

const NftGridItem: React.FC<{ nft: Nft; onAppraise: () => void }> = ({ nft, onAppraise }) => (
    <div className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-800 group transition-all duration-300 hover:border-blue-500 hover:shadow-lg">
        <div className="w-full h-40 bg-gray-700 relative">
            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-3">
            <p className="text-xs text-gray-400 truncate">{nft.collection}</p>
            <h4 className="font-semibold text-white truncate">{nft.name}</h4>
        </div>
        <button onClick={onAppraise} className="w-full bg-brand-blue/80 text-white font-bold text-sm py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Quick Appraise
        </button>
    </div>
);

const NftGridSkeleton: React.FC = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
             <div key={i} className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-800 animate-pulse">
                <div className="w-full h-40 bg-gray-700"></div>
                <div className="p-3">
                    <div className="h-2 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
            </div>
        ))}
    </div>
);


const SettingsView: React.FC = () => {
    const { navigate, walletAddress } = useAppContext();
    
    const [primaryWallet, setPrimaryWallet] = useState<LinkedWallet | null>(null);
    const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>(MOCK_LINKED_WALLETS);
    
    const [newWalletAddress, setNewWalletAddress] = useState('');
    const [isAddingWallet, setIsAddingWallet] = useState(false);
    const [addWalletError, setAddWalletError] = useState('');
    
    const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(walletAddress);
    const [portfolio, setPortfolio] = useState<{ nfts: Nft[], isLoading: boolean, error: string | null }>({
        nfts: [],
        isLoading: true,
        error: null,
    });
    
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if(walletAddress) {
            setPrimaryWallet({ address: walletAddress, lastActive: new Date().toISOString() });
            setSelectedWalletAddress(walletAddress);
        }
    }, [walletAddress]);


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
        loadNftsForWallet(selectedWalletAddress);
    }, [selectedWalletAddress, loadNftsForWallet]);
    
    const filteredNfts = portfolio.nfts.filter(nft => 
        nft.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        nft.collection.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectWallet = (address: string) => {
        setSelectedWalletAddress(address);
        const now = new Date().toISOString();
        if (primaryWallet && address === primaryWallet.address) {
            setPrimaryWallet(prev => prev ? { ...prev, lastActive: now } : null);
        } else {
            setLinkedWallets(prevWallets =>
                prevWallets.map(wallet =>
                    wallet.address === address ? { ...wallet, lastActive: now } : wallet
                )
            );
        }
    };

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

    const handleAddWallet = () => {
        if (!/^0x[a-fA-F0-9]{40}$/.test(newWalletAddress)) {
            setAddWalletError('Please enter a valid wallet address.');
            return;
        }
        if (linkedWallets.some(w => w.address === newWalletAddress) || (primaryWallet && primaryWallet.address === newWalletAddress)) {
            setAddWalletError('This wallet is already connected.');
            return;
        }
        setLinkedWallets([...linkedWallets, { address: newWalletAddress, lastActive: new Date().toISOString() }]);
        setNewWalletAddress('');
        setIsAddingWallet(false);
        setAddWalletError('');
    };

    const handleRemoveWallet = (addressToRemove: string) => {
        setLinkedWallets(linkedWallets.filter(wallet => wallet.address !== addressToRemove));
        if(selectedWalletAddress === addressToRemove && primaryWallet){
            handleSelectWallet(primaryWallet.address);
        }
    };

    const renderPortfolioContent = () => {
        if (!walletAddress) {
             return <div className="text-center py-16 bg-brand-gray rounded-lg border border-dashed border-gray-700"><p className="text-gray-400">Please connect your wallet to view your assets.</p></div>
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
                <div className="text-center py-16 bg-brand-gray rounded-lg border border-dashed border-gray-700">
                    <p className="text-gray-400">No NFTs found in this wallet.</p>
                    <p className="text-sm text-gray-500 mt-1">(AI-generated for demonstration)</p>
                </div>
            );
        }
        if (filteredNfts.length === 0) {
            return (
                <div className="text-center py-16 bg-brand-gray rounded-lg border border-dashed border-gray-700">
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
            <div className="lg:col-span-1 bg-brand-gray p-6 rounded-lg border border-gray-700 h-fit">
                <h3 className="font-semibold text-lg text-white mb-4">Connected Wallets</h3>
                <div className="space-y-2">
                    {primaryWallet && (
                         <button onClick={() => handleSelectWallet(primaryWallet.address)} className={`w-full p-3 rounded-md transition-colors text-left ${selectedWalletAddress === primaryWallet.address ? 'bg-blue-900/70' : 'bg-gray-900/50 hover:bg-gray-800/60'}`}>
                             <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-mono text-sm text-blue-300">{shortenAddress(primaryWallet.address)}</span>
                                    <span className="ml-3 text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full">Primary</span>
                                </div>
                             </div>
                             <p className="text-xs text-gray-400 mt-1">Last active: {formatDistanceToNow(new Date(primaryWallet.lastActive), { addSuffix: true })}</p>
                        </button>
                    )}
                    {linkedWallets.map(wallet => (
                        <div key={wallet.address} className={`flex items-center justify-between rounded-md group ${selectedWalletAddress === wallet.address ? 'bg-blue-900/70' : 'bg-gray-900/50 hover:bg-gray-800/60'}`}>
                            <button onClick={() => handleSelectWallet(wallet.address)} className="flex-grow p-3 text-left">
                                <span className="font-mono text-sm text-gray-400">{shortenAddress(wallet.address)}</span>
                                <p className="text-xs text-gray-500 mt-1">Last active: {formatDistanceToNow(new Date(wallet.lastActive), { addSuffix: true })}</p>
                            </button>
                            <button onClick={() => handleRemoveWallet(wallet.address)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-3"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
                {isAddingWallet ? (
                    <div className="mt-4">
                        <input type="text" value={newWalletAddress} onChange={(e) => { setNewWalletAddress(e.target.value); setAddWalletError(''); }} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" placeholder="Enter new wallet address (0x...)" />
                        {addWalletError && <p className="text-red-400 text-xs mt-1">{addWalletError}</p>}
                        <div className="flex justify-end space-x-2 mt-2">
                            <button onClick={() => setIsAddingWallet(false)} className="text-gray-400 text-sm hover:text-white px-3 py-1">Cancel</button>
                            <button onClick={handleAddWallet} className="bg-blue-600 text-white font-semibold text-sm px-4 py-1.5 rounded-md hover:bg-blue-500">Add</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsAddingWallet(true)} className="mt-4 w-full flex items-center justify-center space-x-2 text-blue-300 border-2 border-dashed border-gray-600 hover:border-blue-500 hover:bg-brand-blue/10 rounded-lg py-3 transition-colors">
                        <PlusIcon className="w-5 h-5" />
                        <span>Link New Wallet</span>
                    </button>
                )}
            </div>
            <div className="lg:col-span-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <h3 className="font-semibold text-lg text-white mb-2 sm:mb-0">Assets in <span className="font-mono text-blue-400">{selectedWalletAddress ? shortenAddress(selectedWalletAddress) : 'No Wallet Selected'}</span></h3>
                    <div className="w-full sm:w-auto">
                         <input
                            type="text"
                            placeholder="Filter by name or collection..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 bg-gray-900 border border-gray-700 rounded-lg py-1.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>
                </div>
                {renderPortfolioContent()}
            </div>
        </div>
    );
};

export default SettingsView;