import React from 'react';
import { WalletIcon } from './IconComponents';
import { useAppContext } from '../contexts/AppContext';

interface WalletPickerModalProps {
    onClose: () => void;
}

// Lets the user pick which wallet to connect with instead of assuming
// MetaMask — browser extension (any EIP-1193 provider), Coinbase Wallet,
// or WalletConnect (QR code for mobile wallets).
const WalletPickerModal: React.FC<WalletPickerModalProps> = ({ onClose }) => {
    const { walletOptions, connectRealWallet, isConnectingWallet } = useAppContext();

    const handlePick = async (connectorId: string) => {
        await connectRealWallet(connectorId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-sm bg-brand-navy border border-yellow-900/40 rounded-lg shadow-xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-white mb-1">Connect a Wallet</h3>
                <p className="text-xs text-gray-500 mb-5">Choose how you'd like to connect. This links a real on-chain wallet — no manual address entry.</p>
                <div className="space-y-2">
                    {walletOptions.map(option => (
                        <button
                            key={option.id}
                            onClick={() => handlePick(option.id)}
                            disabled={isConnectingWallet}
                            className="w-full flex items-center gap-3 text-left border border-yellow-900/30 hover:border-brand-gold/60 hover:bg-brand-gold/10 rounded-lg py-3 px-4 transition-colors disabled:opacity-50"
                        >
                            <WalletIcon className="w-5 h-5 text-brand-gold flex-shrink-0" />
                            <span>
                                <span className="block text-sm font-semibold text-white">{option.label}</span>
                                <span className="block text-xs text-gray-500">{option.description}</span>
                            </span>
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="w-full mt-4 text-sm text-gray-400 hover:text-gray-200 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default WalletPickerModal;
