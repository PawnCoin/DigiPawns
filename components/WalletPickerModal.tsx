import React, { useState } from 'react';
import { useConnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAppContext } from '../contexts/AppContext';
import { SOLANA_WALLET_OPTIONS } from '../lib/web3';

interface WalletPickerModalProps {
    onClose: () => void;
}

type WalletTab = 'evm' | 'solana';

// Fallback badge config when the SDK icon is unavailable
const EVM_FALLBACKS: Record<string, { letter: string; bg: string }> = {
    injected:           { letter: 'M', bg: 'bg-orange-500' },
    coinbaseWalletSDK:  { letter: 'C', bg: 'bg-blue-600'   },
    walletConnect:      { letter: 'W', bg: 'bg-blue-500'   },
};

const SOLANA_FALLBACKS: Record<string, { letter: string; bg: string }> = {
    Phantom:  { letter: 'P', bg: 'bg-purple-600' },
    Solflare: { letter: 'S', bg: 'bg-orange-400' },
    Backpack: { letter: 'B', bg: 'bg-red-500'    },
};

// Defined outside the parent to keep React state stable across re-renders
const WalletLogoImg: React.FC<{
    src?: string;
    fallbackLetter: string;
    fallbackBg: string;
    alt: string;
}> = ({ src, fallbackLetter, fallbackBg, alt }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm text-white ${fallbackBg}`}>
                {fallbackLetter}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
            onError={() => setFailed(true)}
        />
    );
};

const WalletPickerModal: React.FC<WalletPickerModalProps> = ({ onClose }) => {
    const {
        walletOptions, connectRealWallet, isConnectingWallet,
        connectSolanaWallet, isSolanaConnected,
    } = useAppContext();

    // wagmi connectors carry real brand icons (MetaMask fox, Coinbase logo, WalletConnect logo)
    const { connectors } = useConnect();
    // Solana adapters carry real brand icons as base64 SVG data URLs
    const { wallets: solanaWallets } = useWallet();

    const [tab, setTab] = useState<WalletTab>('evm');
    const [wcError, setWcError] = useState(false);

    const evmIcon = (connectorId: string): string | undefined =>
        connectors.find(c => c.id === connectorId)?.icon;

    const solanaIcon = (walletName: string): string | undefined =>
        solanaWallets.find(w => w.adapter.name === walletName)?.adapter.icon;

    const handleEvmPick = async (connectorId: string) => {
        setWcError(false);
        const result = await connectRealWallet(connectorId);
        if (result?.success) {
            onClose();
        } else if (connectorId === 'walletConnect' && result?.errorType === 'allowlist') {
            setWcError(true); // Keep modal open, show inline error
        } else if (result?.errorType === 'cancelled') {
            // User cancelled — keep modal open so they can try another wallet
        } else {
            onClose(); // Generic failures already shown via toast
        }
    };

    const handleSolanaPick = (walletName: string) => {
        connectSolanaWallet(walletName);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-brand-navy border border-yellow-900/40 rounded-lg shadow-xl p-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-white mb-1">Connect a Wallet</h3>
                <p className="text-xs text-gray-500 mb-4">Choose your chain, then your wallet.</p>

                {/* Tab switcher */}
                <div className="flex rounded-lg border border-yellow-900/30 mb-5 overflow-hidden">
                    {(['evm', 'solana'] as WalletTab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setWcError(false); }}
                            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                                tab === t
                                    ? 'bg-brand-gold text-brand-dark'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {t === 'evm' ? '⬡ EVM (ETH / Polygon)' : '◎ Solana'}
                        </button>
                    ))}
                </div>

                {tab === 'evm' && (
                    <div className="space-y-2">
                        {walletOptions.map(option => {
                            const isWC = option.id === 'walletConnect';
                            const fb = EVM_FALLBACKS[option.id] ?? { letter: option.label[0], bg: 'bg-gray-600' };
                            return (
                                <div key={option.id}>
                                    <button
                                        onClick={() => handleEvmPick(option.id)}
                                        disabled={isConnectingWallet}
                                        className={`w-full flex items-center gap-3 text-left border rounded-lg py-3 px-4 transition-colors disabled:opacity-50 ${
                                            isWC && wcError
                                                ? 'border-red-500/60 bg-red-950/20'
                                                : 'border-yellow-900/30 hover:border-brand-gold/60 hover:bg-brand-gold/10'
                                        }`}
                                    >
                                        <WalletLogoImg
                                            src={evmIcon(option.id)}
                                            fallbackLetter={fb.letter}
                                            fallbackBg={fb.bg}
                                            alt={option.label}
                                        />
                                        <span>
                                            <span className="block text-sm font-semibold text-white">{option.label}</span>
                                            <span className="block text-xs text-gray-500">{option.description}</span>
                                        </span>
                                    </button>

                                    {/* Allowlist error — shown only after a failed WC attempt */}
                                    {isWC && wcError && (
                                        <div className="mt-1 rounded-md bg-red-950/40 border border-red-700/40 px-3 py-2">
                                            <p className="text-xs text-red-300 font-semibold">Domain not on allowlist</p>
                                            <p className="text-[11px] text-red-400/80 mt-0.5">
                                                Go to{' '}
                                                <a href="https://cloud.reown.com" target="_blank" rel="noreferrer"
                                                    className="underline hover:text-red-300">
                                                    cloud.reown.com
                                                </a>
                                                {' '}→ your project → Allowed Origins, add this domain, then retry.
                                            </p>
                                        </div>
                                    )}
                                    {/* Pre-emptive hint when no error yet */}
                                    {isWC && !wcError && (
                                        <p className="text-[11px] text-gray-600 px-1 mt-1">
                                            Scan a QR code with any mobile wallet.
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                        <p className="text-xs text-gray-600 pt-1">Supports Ethereum, Polygon, and Base Sepolia.</p>
                    </div>
                )}

                {tab === 'solana' && (
                    <div className="space-y-2">
                        {isSolanaConnected && (
                            <p className="text-xs text-green-400 mb-2">
                                ✅ Solana wallet already connected. Select another to switch.
                            </p>
                        )}
                        {SOLANA_WALLET_OPTIONS.map(w => {
                            const fb = SOLANA_FALLBACKS[w.name] ?? { letter: w.name[0], bg: 'bg-gray-600' };
                            return (
                                <button
                                    key={w.name}
                                    onClick={() => handleSolanaPick(w.name)}
                                    className="w-full flex items-center gap-3 text-left border border-yellow-900/30 hover:border-purple-500/60 hover:bg-purple-900/10 rounded-lg py-3 px-4 transition-colors"
                                >
                                    <WalletLogoImg
                                        src={solanaIcon(w.name)}
                                        fallbackLetter={fb.letter}
                                        fallbackBg={fb.bg}
                                        alt={w.name}
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold text-white">{w.name}</span>
                                        <span className="block text-xs text-gray-500">{w.description}</span>
                                    </span>
                                </button>
                            );
                        })}
                        <p className="text-xs text-gray-600 pt-1">
                            Make sure the wallet extension is installed in your browser.
                        </p>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-4 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default WalletPickerModal;
