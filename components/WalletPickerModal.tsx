import React, { useState } from 'react';
import { WalletIcon } from './IconComponents';
import { useAppContext } from '../contexts/AppContext';
import { SOLANA_WALLET_OPTIONS } from '../lib/web3';

interface WalletPickerModalProps {
    onClose: () => void;
}

type WalletTab = 'evm' | 'solana';

const WalletPickerModal: React.FC<WalletPickerModalProps> = ({ onClose }) => {
    const {
        walletOptions, connectRealWallet, isConnectingWallet,
        connectSolanaWallet, isSolanaConnected,
    } = useAppContext();

    const [tab, setTab] = useState<WalletTab>('evm');

    const handleEvmPick = async (connectorId: string) => {
        await connectRealWallet(connectorId);
        onClose();
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
                            onClick={() => setTab(t)}
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
                            return (
                                <div key={option.id}>
                                    <button
                                        onClick={() => handleEvmPick(option.id)}
                                        disabled={isConnectingWallet}
                                        className="w-full flex items-center gap-3 text-left border border-yellow-900/30 hover:border-brand-gold/60 hover:bg-brand-gold/10 rounded-lg py-3 px-4 transition-colors disabled:opacity-50"
                                    >
                                        <WalletIcon className="w-5 h-5 text-brand-gold flex-shrink-0" />
                                        <span>
                                            <span className="block text-sm font-semibold text-white">{option.label}</span>
                                            <span className="block text-xs text-gray-500">{option.description}</span>
                                        </span>
                                    </button>
                                    {isWC && (
                                        <p className="text-[11px] text-yellow-600/80 px-1 mt-1">
                                            ⚠️ Requires your domain on the allowlist at{' '}
                                            <a href="https://cloud.reown.com" target="_blank" rel="noreferrer" className="underline hover:text-yellow-400">cloud.reown.com</a>.
                                            Try MetaMask or Coinbase Wallet if it fails.
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
                            <p className="text-xs text-green-400 mb-2">✅ Solana wallet already connected. Select another to switch.</p>
                        )}
                        {SOLANA_WALLET_OPTIONS.map(w => (
                            <button
                                key={w.name}
                                onClick={() => handleSolanaPick(w.name)}
                                className="w-full flex items-center gap-3 text-left border border-yellow-900/30 hover:border-purple-500/60 hover:bg-purple-900/10 rounded-lg py-3 px-4 transition-colors"
                            >
                                <span className="text-xl flex-shrink-0">{w.icon}</span>
                                <span>
                                    <span className="block text-sm font-semibold text-white">{w.name}</span>
                                    <span className="block text-xs text-gray-500">{w.description}</span>
                                </span>
                            </button>
                        ))}
                        <p className="text-xs text-gray-600 pt-1">Make sure the wallet extension is installed in your browser.</p>
                    </div>
                )}

                <button onClick={onClose} className="w-full mt-4 text-sm text-gray-400 hover:text-gray-200 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default WalletPickerModal;
