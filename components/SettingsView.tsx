import React, { useState, useEffect, useCallback } from 'react';
import { WalletIcon } from './IconComponents';
import type { Nft, WatchedWallet } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { fetchNftsForWallet } from '../services/nftService';
import {
    SUPPORTED_CHAINS,
    fetchNftsFromAlchemy,
    fetchNftsFromOpenSea,
    resolveInput,
    type SupportedChain,
} from '../services/openSeaService';
import BrowseSellModal from './BrowseSellModal';

// ── NFT card used in both portfolio and browse results ────────────────────

interface NftGridItemProps {
    nft: Nft & { chain?: string };
    onAppraise: () => void;
    onSell?: () => void;
}

// Map Alchemy network prefixes (used in nft.id) to badge metadata.
// Covers both mainnet and testnet variants so portfolio NFTs always get a badge.
const ALCHEMY_NETWORK_BADGE: Record<string, { badge: string; color: string }> = {
    'eth-mainnet':     { badge: 'ETH',  color: 'text-blue-300' },
    'polygon-mainnet': { badge: 'MATIC', color: 'text-purple-300' },
    'base-mainnet':    { badge: 'BASE',  color: 'text-indigo-300' },
    'base-sepolia':    { badge: 'BASE',  color: 'text-indigo-300' },
    'solana-mainnet':  { badge: 'SOL',   color: 'text-green-300' },
    'arb-mainnet':     { badge: 'ARB',   color: 'text-sky-300' },
    'opt-mainnet':     { badge: 'OP',    color: 'text-red-300' },
};

/**
 * Resolve a chain badge from an NFT.
 * 1. If the nft carries a `.chain` label (set by OpenSea/browse path), match via SUPPORTED_CHAINS.
 * 2. Otherwise derive from the Alchemy network prefix in nft.id (e.g. "eth-mainnet-0xabc-1").
 */
function resolveChainBadge(nft: Nft & { chain?: string }): { badge: string; color: string } | undefined {
    if (nft.chain) {
        const match = SUPPORTED_CHAINS.find(c => c.label === nft.chain);
        if (match) return { badge: match.badge, color: match.color };
    }
    const id = String(nft.id);
    for (const [prefix, meta] of Object.entries(ALCHEMY_NETWORK_BADGE)) {
        if (id.startsWith(prefix + '-')) return meta;
    }
    return undefined;
}

const NftGridItem: React.FC<NftGridItemProps> = ({ nft, onAppraise, onSell }) => {
    const chainBadge = resolveChainBadge(nft);
    return (
        <div className="bg-brand-dark/60 rounded-lg overflow-hidden border border-yellow-900/30 group transition-all duration-300 hover:border-brand-gold/60 hover:shadow-lg flex flex-col">
            <div className="w-full h-40 bg-brand-dark relative flex-shrink-0">
                <img
                    src={nft.imageUrl}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/1a1a2e/d4af37?text=No+Image'; }}
                />
                {chainBadge && (
                    <span className={`absolute top-1 right-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-brand-dark/80 ${chainBadge.color}`}>
                        {chainBadge.badge}
                    </span>
                )}
            </div>
            <div className="p-3 flex-1">
                <p className="text-xs text-gray-400 truncate">{nft.collection}</p>
                <h4 className="font-semibold text-white truncate text-sm">{nft.name}</h4>
            </div>
            <div className={`grid ${onSell ? 'grid-cols-2' : 'grid-cols-1'} gap-px opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                <button
                    onClick={onAppraise}
                    className="bg-brand-gold-dark/80 text-white font-bold text-xs py-2 px-2 hover:bg-brand-gold-dark transition-colors"
                >
                    Appraise & Pawn
                </button>
                {onSell && (
                    <button
                        onClick={onSell}
                        className="bg-yellow-700/60 text-white font-bold text-xs py-2 px-2 hover:bg-yellow-700 transition-colors"
                    >
                        Sell to Shop
                    </button>
                )}
            </div>
        </div>
    );
};

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

// ── Chain filter chip ─────────────────────────────────────────────────────

const ChainChip: React.FC<{ chain: SupportedChain; selected: boolean; onClick: () => void }> = ({ chain, selected, onClick }) => (
    <button
        onClick={onClick}
        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
            selected
                ? 'bg-brand-gold text-brand-dark border-brand-gold'
                : 'border-yellow-900/40 text-gray-400 hover:border-brand-gold/50 hover:text-white'
        }`}
    >
        {chain.label}
    </button>
);

// ── Source toggle ─────────────────────────────────────────────────────────

type DataSource = 'alchemy' | 'opensea' | 'both';

// ── Main component ────────────────────────────────────────────────────────

type PortfolioTab = 'my-wallet' | 'browse';

const SettingsView: React.FC = () => {
    const {
        navigate, walletAddress, isWalletConnected, isConnectingWallet, isCorrectChain, chainName,
        disconnectChainWallet, openWalletPicker,
        isConnected, watchedWallets, saveWatchedWallet, removeWatchedWallet,
    } = useAppContext();
    const [portfolioTab, setPortfolioTab] = useState<PortfolioTab>('my-wallet');

    // ── My Wallet state ───────────────────────────────────────────────────
    const [portfolio, setPortfolio] = useState<{ nfts: Nft[]; isLoading: boolean; error: string | null }>({
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

    // ── Browse Wallet state ───────────────────────────────────────────────
    const [browseInput, setBrowseInput] = useState('');
    const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set(['ethereum', 'base', 'polygon']));
    const [dataSource, setDataSource] = useState<DataSource>('alchemy');
    const [browseResult, setBrowseResult] = useState<{
        nfts: (Nft & { chain?: string })[];
        isLoading: boolean;
        error: string | null;
        resolvedAddress: string | null;
        totalFetched: number;
    }>({ nfts: [], isLoading: false, error: null, resolvedAddress: null, totalFetched: 0 });

    // Sell modal state
    const [sellTarget, setSellTarget] = useState<(Nft & { chain?: string }) | null>(null);

    // Save-wallet state
    const [saveLabel, setSaveLabel] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    const hasOpenSeaKey = !!process.env.OPENSEA_API_KEY;

    const toggleChain = (chainId: string) => {
        setSelectedChains(prev => {
            const next = new Set(prev);
            if (next.has(chainId)) {
                if (next.size === 1) return prev; // keep at least one
                next.delete(chainId);
            } else {
                next.add(chainId);
            }
            return next;
        });
    };

    const handleBrowse = async (overrideInput?: string) => {
        const raw = (overrideInput ?? browseInput).trim();
        if (!raw) return;

        setSavedSuccess(false);
        setSaveLabel('');
        setBrowseResult({ nfts: [], isLoading: true, error: null, resolvedAddress: null, totalFetched: 0 });

        // 1. Resolve input to an address
        const { address, addressKind, error: resolveError } = await resolveInput(raw);
        if (resolveError || !address) {
            setBrowseResult({ nfts: [], isLoading: false, error: resolveError || 'Could not resolve address.', resolvedAddress: null, totalFetched: 0 });
            return;
        }

        // 2. Pick chains to query
        const chains = SUPPORTED_CHAINS.filter(c => selectedChains.has(c.id));

        // If Solana address, limit to Solana chain
        const activeChains = addressKind === 'solana'
            ? SUPPORTED_CHAINS.filter(c => c.id === 'solana')
            : chains.filter(c => c.id !== 'solana');

        try {
            let nfts: (Nft & { chain?: string })[] = [];

            if (dataSource === 'alchemy' || dataSource === 'both') {
                const alchemyNfts = await fetchNftsFromAlchemy(address, activeChains);
                nfts.push(...alchemyNfts);
            }

            if (dataSource === 'opensea' || dataSource === 'both') {
                if (!hasOpenSeaKey) {
                    if (dataSource === 'opensea') {
                        setBrowseResult({
                            nfts: [],
                            isLoading: false,
                            error: 'OpenSea API key not configured. Add OPENSEA_API_KEY to Replit Secrets, or switch to Alchemy source.',
                            resolvedAddress: address,
                            totalFetched: 0,
                        });
                        return;
                    }
                    // dataSource === 'both' — just skip OpenSea silently
                } else {
                    const openSeaNfts = await fetchNftsFromOpenSea(address, activeChains);
                    // De-duplicate against Alchemy results by contractAddress+tokenId
                    const existingKeys = new Set(nfts.map(n => `${n.contractAddress}-${n.tokenId}`));
                    nfts.push(...openSeaNfts.filter(n => !existingKeys.has(`${n.contractAddress}-${n.tokenId}`)));
                }
            }

            setBrowseResult({
                nfts,
                isLoading: false,
                error: null,
                resolvedAddress: address,
                totalFetched: nfts.length,
            });
        } catch (err) {
            setBrowseResult({
                nfts: [],
                isLoading: false,
                error: err instanceof Error ? err.message : 'Fetch failed.',
                resolvedAddress: address,
                totalFetched: 0,
            });
        }
    };

    // ── Shared actions ────────────────────────────────────────────────────

    const handleAppraiseClick = (nft: Nft) => {
        navigate('/');
        setTimeout(() => {
            const contractInput = document.getElementById('contractAddress') as HTMLInputElement;
            const tokenInput = document.getElementById('tokenId') as HTMLInputElement;
            const appraiseSection = document.getElementById('appraise');
            if (contractInput && tokenInput) {
                contractInput.value = nft.contractAddress;
                tokenInput.value = nft.tokenId;
                contractInput.dispatchEvent(new Event('input', { bubbles: true }));
                tokenInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (appraiseSection) {
                const headerOffset = 80;
                const offsetPosition = appraiseSection.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        }, 100);
    };

    // ── Render helpers ────────────────────────────────────────────────────

    const shortenAddress = (address: string) =>
        address.length > 12 ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : address;

    const renderMyPortfolio = () => {
        if (!walletAddress) {
            return <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40"><p className="text-gray-400">Connect a wallet to view your assets.</p></div>;
        }
        if (portfolio.isLoading) return <NftGridSkeleton />;
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
                    <p className="text-gray-400">No NFTs found on Base Sepolia testnet for this wallet.</p>
                </div>
            );
        }
        if (filteredNfts.length === 0) {
            return (
                <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40">
                    <p className="text-gray-400">No assets matching "{searchTerm}".</p>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredNfts.map(nft => (
                    <NftGridItem
                        key={nft.id}
                        nft={nft}
                        onAppraise={() => handleAppraiseClick(nft)}
                        onSell={() => setSellTarget(nft)}
                    />
                ))}
            </div>
        );
    };

    const handleSaveWallet = async () => {
        if (!browseResult.resolvedAddress) return;
        setIsSaving(true);
        try {
            const label = saveLabel.trim() || browseInput.trim() || browseResult.resolvedAddress;
            await saveWatchedWallet(browseResult.resolvedAddress, label);
            setSavedSuccess(true);
            setSaveLabel('');
        } catch {
            // Toast already shown by saveWatchedWallet — nothing more to do here
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadSaved = (w: WatchedWallet) => {
        setBrowseInput(w.address);
        handleBrowse(w.address);
    };

    const alreadySaved = browseResult.resolvedAddress
        ? watchedWallets.some(w => w.address.toLowerCase() === browseResult.resolvedAddress!.toLowerCase())
        : false;

    const renderBrowseWallet = () => (
        <div className="space-y-6">
            {/* Search bar */}
            <div className="bg-brand-navy rounded-xl border border-yellow-900/40 p-6">
                <h4 className="font-semibold text-white mb-1">Browse Any Wallet</h4>
                <p className="text-xs text-gray-500 mb-4">
                    Enter a wallet address, ENS name (e.g. <span className="text-brand-gold font-mono">vitalik.eth</span>),
                    or OpenSea username to view all NFTs.
                </p>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={browseInput}
                        onChange={e => setBrowseInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleBrowse()}
                        placeholder="0x…  /  vitalik.eth  /  opensea-username"
                        className="flex-1 bg-brand-dark border border-yellow-900/40 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/60 text-white placeholder-gray-600"
                    />
                    <button
                        onClick={() => handleBrowse()}
                        disabled={browseResult.isLoading || !browseInput.trim()}
                        className="btn-metallic-gold py-2 px-5 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:[animation:none] disabled:!bg-gray-700 disabled:!text-gray-400 whitespace-nowrap"
                    >
                        {browseResult.isLoading ? 'Fetching…' : 'Fetch NFTs'}
                    </button>
                </div>

                {/* Data source toggle */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-gray-500 mr-1">Source:</span>
                    {(['alchemy', 'opensea', 'both'] as DataSource[]).map(src => (
                        <button
                            key={src}
                            onClick={() => setDataSource(src)}
                            className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                                dataSource === src
                                    ? 'bg-brand-gold text-brand-dark border-brand-gold font-bold'
                                    : 'border-yellow-900/40 text-gray-400 hover:border-brand-gold/50 hover:text-white'
                            }`}
                        >
                            {src === 'both' ? 'Both' : src === 'alchemy' ? 'Alchemy' : 'OpenSea'}
                        </button>
                    ))}
                    {!hasOpenSeaKey && (dataSource === 'opensea' || dataSource === 'both') && (
                        <span className="text-xs text-yellow-500 ml-2">⚠ Add OPENSEA_API_KEY secret to enable OpenSea</span>
                    )}
                </div>

                {/* Chain filter */}
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500 self-center mr-1">Chains:</span>
                    {SUPPORTED_CHAINS.map(chain => (
                        <ChainChip
                            key={chain.id}
                            chain={chain}
                            selected={selectedChains.has(chain.id)}
                            onClick={() => toggleChain(chain.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Saved Wallets */}
            {isConnected && watchedWallets.length > 0 && (
                <div className="bg-brand-navy rounded-xl border border-yellow-900/40 p-4">
                    <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">⭐ Saved Wallets</h5>
                    <div className="flex flex-col gap-2">
                        {watchedWallets.map(w => (
                            <div key={w.id} className="flex items-center gap-2 group">
                                <button
                                    onClick={() => handleLoadSaved(w)}
                                    className="flex-1 flex items-center gap-3 text-left px-3 py-2 rounded-lg bg-brand-dark/60 hover:bg-brand-gold/10 border border-yellow-900/30 hover:border-brand-gold/50 transition-colors"
                                >
                                    <span className="text-sm font-semibold text-white truncate">{w.label}</span>
                                    <span className="text-xs font-mono text-gray-500 shrink-0">{shortenAddress(w.address)}</span>
                                </button>
                                <button
                                    onClick={() => removeWatchedWallet(w.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 p-1.5 rounded"
                                    title="Remove saved wallet"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {browseResult.isLoading && <NftGridSkeleton />}

            {browseResult.error && (
                <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-center">
                    <p className="text-red-300 text-sm">{browseResult.error}</p>
                </div>
            )}

            {!browseResult.isLoading && !browseResult.error && browseResult.resolvedAddress && (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                        <p className="text-sm text-gray-400">
                            {browseResult.totalFetched > 0
                                ? <><span className="text-white font-semibold">{browseResult.totalFetched}</span> NFTs found for <span className="font-mono text-brand-gold">{shortenAddress(browseResult.resolvedAddress)}</span></>
                                : <>No NFTs found for <span className="font-mono text-brand-gold">{shortenAddress(browseResult.resolvedAddress)}</span> on selected chains.</>
                            }
                        </p>

                        {/* Save button — only for signed-in users */}
                        {isConnected && (
                            <div className="flex items-center gap-2 shrink-0">
                                {savedSuccess ? (
                                    <span className="text-xs text-green-400 font-semibold">✓ Saved!</span>
                                ) : alreadySaved ? (
                                    <span className="text-xs text-gray-500 italic">Already saved</span>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            value={saveLabel}
                                            onChange={e => setSaveLabel(e.target.value)}
                                            placeholder="Label (optional)"
                                            className="w-36 bg-brand-dark border border-yellow-900/40 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold/60 text-white placeholder-gray-600"
                                        />
                                        <button
                                            onClick={handleSaveWallet}
                                            disabled={isSaving}
                                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-gold/20 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/30 transition-colors disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {isSaving ? 'Saving…' : '⭐ Save Wallet'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {browseResult.nfts.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {browseResult.nfts.map(nft => (
                                <NftGridItem
                                    key={nft.id}
                                    nft={nft}
                                    onAppraise={() => handleAppraiseClick(nft)}
                                    onSell={() => setSellTarget(nft)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {!browseResult.isLoading && !browseResult.resolvedAddress && !browseResult.error && (
                <div className="text-center py-16 bg-brand-navy rounded-lg border border-dashed border-yellow-900/40">
                    <p className="text-3xl mb-3">🔍</p>
                    <p className="text-gray-400">Enter a wallet address or username above to browse NFTs across chains.</p>
                </div>
            )}
        </div>
    );

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left panel — wallet connection */}
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
                            onClick={openWalletPicker}
                            disabled={isConnectingWallet}
                            className="w-full flex items-center justify-center space-x-2 text-brand-gold border-2 border-dashed border-yellow-900/40 hover:border-brand-gold/60 hover:bg-brand-gold/10 rounded-lg py-3 transition-colors disabled:opacity-50"
                        >
                            <WalletIcon className="w-5 h-5" />
                            <span>{isConnectingWallet ? 'Connecting…' : 'Connect Wallet'}</span>
                        </button>
                    )}

                    {/* Quick-browse tip */}
                    <div className="mt-6 p-3 bg-brand-dark/50 rounded-lg border border-yellow-900/20">
                        <p className="text-xs text-gray-500 leading-relaxed">
                            <span className="text-brand-gold font-semibold">Tip:</span> Use the <span className="font-semibold text-white">Browse Wallet</span> tab to look up any wallet, ENS name, or OpenSea username — no connection required.
                        </p>
                    </div>
                </div>

                {/* Right panel — portfolio / browse */}
                <div className="lg:col-span-2">
                    {/* Sub-tabs */}
                    <div className="flex gap-2 mb-5 border-b border-yellow-900/30 pb-3">
                        <button
                            onClick={() => setPortfolioTab('my-wallet')}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                                portfolioTab === 'my-wallet'
                                    ? 'bg-brand-gold text-brand-dark'
                                    : 'text-gray-400 hover:text-white hover:bg-brand-navy'
                            }`}
                        >
                            My Portfolio
                        </button>
                        <button
                            onClick={() => setPortfolioTab('browse')}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                                portfolioTab === 'browse'
                                    ? 'bg-brand-gold text-brand-dark'
                                    : 'text-gray-400 hover:text-white hover:bg-brand-navy'
                            }`}
                        >
                            🔍 Browse Wallet
                        </button>
                    </div>

                    {portfolioTab === 'my-wallet' ? (
                        <>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                                <h3 className="font-semibold text-lg text-white mb-2 sm:mb-0">
                                    Assets in <span className="font-mono text-brand-gold">{walletAddress ? shortenAddress(walletAddress) : 'No Wallet Connected'}</span>
                                </h3>
                                <input
                                    type="text"
                                    placeholder="Filter by name or collection..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-64 bg-brand-dark border border-yellow-900/40 rounded-lg py-1.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/60 transition text-white placeholder-gray-600"
                                />
                            </div>
                            {renderMyPortfolio()}
                        </>
                    ) : renderBrowseWallet()}
                </div>
            </div>

            {/* Sell modal */}
            {sellTarget && (
                <BrowseSellModal
                    nft={sellTarget}
                    onClose={() => setSellTarget(null)}
                />
            )}
        </>
    );
};

export default SettingsView;
