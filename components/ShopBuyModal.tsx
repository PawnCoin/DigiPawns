import React, { useState, useEffect } from 'react';
import type { ShopItem } from '../types';
import { CheckCircleIcon, ErrorIcon } from './IconComponents';
import { Spinner, WrongNetworkBanner, PaymentOptionGrid } from './PaymentUI';
import { usePaymentFlow, PAYMENT_OPTIONS, DIG_ADDRESS, PC_ETH_ADDRESS, fmt, fmtTok } from '../hooks/usePaymentFlow';
import { useAppContext } from '../contexts/AppContext';

// ── Props ────────────────────────────────────────────────────────────────────
interface ShopBuyModalProps {
    item: ShopItem;
    onClose: () => void;
}

type ModalStep = 'initial' | 'processing' | 'success' | 'error' | 'payment-recorded-failed';

// ── Component ─────────────────────────────────────────────────────────────────
const ShopBuyModal: React.FC<ShopBuyModalProps> = ({ item, onClose }) => {
    const [step, setStep]                 = useState<ModalStep>('initial');
    const [errorMessage, setErrorMessage] = useState('');
    const [savedAmount, setSavedAmount]   = useState(0);
    const [savedToken, setSavedToken]     = useState('');
    // Set when the on-chain payment succeeded but Firestore recording failed.
    // User must note the tx hash to contact support.
    const [txHashForRecovery, setTxHashForRecovery] = useState<string | undefined>();

    const { buyShopItem, profile } = useAppContext();

    const STARTING_BALANCE = 25000;
    const storeCredit = profile.balance ?? STARTING_BALANCE;
    const standardPrice = item.price;

    const flow = usePaymentFlow({
        standardAmount: standardPrice,
        getCreditStatus: () => {
            const insufficient = storeCredit < standardPrice;
            return {
                available: !insufficient,
                note: `Balance: $${storeCredit.toLocaleString()}`,
                insufficient,
                tokenAmount: 0,
            };
        },
    });

    const { selectedKey, setSelectedKey, selectedOption, discount, discountedAmount, savings,
            tokenPrice, getOptionStatus, executeERC20, executeSPL, evmOptionSelected } = flow;

    // Reset on mount
    useEffect(() => {
        setStep('initial');
        setErrorMessage('');
        setSelectedKey('credit');
    }, [item.id]);

    // ── Main confirm handler ─────────────────────────────────────────────────
    const handleConfirm = async () => {
        setStep('processing');
        // Track on-chain tx hash separately so we can surface it in recovery if
        // Firestore recording fails AFTER a successful payment.
        let completedTxHash: string | undefined;
        try {
            let paymentInfo: { txHash?: string; token: string; discountPct: number } | undefined;

            if (selectedKey === 'credit') {
                await buyShopItem(item.id);           // throws on any failure
            } else if (selectedKey === 'DIG') {
                completedTxHash = await executeERC20(DIG_ADDRESS, discountedAmount, 'DIG');
                paymentInfo = { txHash: completedTxHash, token: 'DIG', discountPct: discount };
                await buyShopItem(item.id, paymentInfo); // throws if Firestore write fails
            } else if (selectedKey === 'PC-ETH') {
                completedTxHash = await executeERC20(PC_ETH_ADDRESS, discountedAmount, 'PC-ETH');
                paymentInfo = { txHash: completedTxHash, token: 'PC-ETH', discountPct: discount };
                await buyShopItem(item.id, paymentInfo);
            } else if (selectedKey === 'PC-SOL') {
                completedTxHash = await executeSPL(discountedAmount);
                paymentInfo = { txHash: completedTxHash, token: 'PC-SOL', discountPct: discount };
                await buyShopItem(item.id, paymentInfo);
            }

            // Only reaches here if buyShopItem resolved without throwing.
            setSavedAmount(savings);
            setSavedToken(selectedOption.label);
            setStep('success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (/rejected|denied|user rejected/i.test(msg)) {
                // User cancelled in wallet — stay on initial screen, no error shown.
                setStep('initial');
            } else if (completedTxHash) {
                // On-chain payment succeeded but Firestore recording failed.
                // Surface the tx hash so the user can contact support.
                setTxHashForRecovery(completedTxHash);
                setStep('payment-recorded-failed');
            } else {
                setErrorMessage(msg);
                setStep('error');
            }
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    const renderContent = () => {
        if (step === 'processing') return (
            <div className="flex flex-col items-center gap-4 py-8">
                <Spinner />
                <p className="text-gray-300 font-medium">Processing purchase…</p>
                <p className="text-gray-500 text-sm text-center">Confirm in your wallet if prompted.<br />Do not close this window.</p>
            </div>
        );

        if (step === 'success') return (
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-semibold text-center">Purchase Complete!</h3>
                {savedAmount > 0 && (
                    <div className="bg-green-950/60 border border-green-800/40 rounded-xl px-6 py-3 text-center">
                        <p className="text-green-300 font-black text-lg">✅ You saved ${fmt(savedAmount)}</p>
                        <p className="text-green-400/80 text-sm">by paying with {savedToken}</p>
                    </div>
                )}
                <p className="text-gray-400 text-center text-sm">{item.name} is now in your collection.</p>
                <button onClick={onClose} className="w-full btn-metallic-gold py-3 rounded-xl font-bold mt-2">Done</button>
            </div>
        );

        if (step === 'error') return (
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                    <ErrorIcon className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-center text-red-300">Purchase Failed</h3>
                <p className="text-sm text-gray-400 text-center break-words max-w-xs">{errorMessage}</p>
                <button onClick={() => setStep('initial')} className="w-full border border-yellow-900/40 text-gray-300 hover:text-white py-3 rounded-xl font-semibold mt-2 transition-colors">Try Again</button>
            </div>
        );

        if (step === 'payment-recorded-failed') return (
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20">
                    <ErrorIcon className="h-8 w-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold text-center text-yellow-300">Payment Sent — Recording Failed</h3>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                    Your payment went through on-chain, but we couldn't record the purchase. Save your transaction hash and contact support — your ownership will be confirmed manually.
                </p>
                {txHashForRecovery && (
                    <div className="w-full bg-brand-dark/80 border border-yellow-900/40 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1 font-medium">Transaction Hash</p>
                        <p className="text-xs text-yellow-300 break-all font-mono select-all">{txHashForRecovery}</p>
                    </div>
                )}
                <button onClick={onClose} className="w-full border border-yellow-900/40 text-gray-300 hover:text-white py-3 rounded-xl font-semibold mt-2 transition-colors">Close</button>
            </div>
        );

        // ── initial ──────────────────────────────────────────────────────────
        const currentPrice = tokenPrice(selectedKey);
        const tokenAmt     = currentPrice ? discountedAmount / currentPrice : null;

        return (
            <>
                <WrongNetworkBanner evmOptionSelected={evmOptionSelected} />

                {/* Item header */}
                <div className="flex gap-4 items-center mb-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-brand-dark/60 border border-yellow-900/20">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-gray-400 truncate">{item.collection}</p>
                        <h3 className="font-bold text-white text-lg truncate">{item.name}</h3>
                        <p className="text-brand-gold font-black text-xl">${standardPrice.toLocaleString()}</p>
                    </div>
                </div>

                {/* Price summary */}
                <div className="space-y-1.5 bg-brand-dark/50 p-3 rounded-xl border border-yellow-900/20 mb-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Standard price:</span>
                        <span className={discount > 0 ? 'line-through text-gray-600' : 'font-semibold text-white'}>${fmt(standardPrice)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-green-400 font-semibold">With {selectedOption.label} ({Math.round(discount * 100)}% off):</span>
                            <span className="font-bold text-green-300">${fmt(discountedAmount)}</span>
                        </div>
                    )}
                </div>

                {/* Payment options */}
                <p className="text-sm font-medium text-gray-300 mb-2">Pay with:</p>
                <PaymentOptionGrid
                    options={PAYMENT_OPTIONS}
                    selectedKey={selectedKey}
                    onSelect={setSelectedKey}
                    getOptionStatus={getOptionStatus}
                />

                {/* Token amount preview */}
                {selectedKey !== 'credit' && tokenAmt !== null && (
                    <div className="mt-3 p-3 bg-brand-dark/40 rounded-lg border border-yellow-900/20 flex justify-between items-center text-sm">
                        <span className="text-gray-400">You send:</span>
                        <span className="font-bold text-white">{fmtTok(tokenAmt)} {selectedOption.label}</span>
                    </div>
                )}

                {/* Insufficient nudge */}
                {selectedKey !== 'credit' && getOptionStatus(selectedOption).insufficient && (
                    <p className="mt-2 text-xs text-amber-400 text-center">
                        Not enough {selectedOption.label} — swap some first in the Swap tab.
                    </p>
                )}
                {selectedKey === 'credit' && getOptionStatus(selectedOption).insufficient && (
                    <p className="mt-2 text-xs text-red-400 text-center">
                        Not enough store credit (${storeCredit.toLocaleString()} available).
                    </p>
                )}

                <button
                    onClick={handleConfirm}
                    disabled={!getOptionStatus(selectedOption).available}
                    className="w-full btn-metallic-gold py-3 rounded-xl font-bold text-base mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:[animation:none]"
                >
                    {discount > 0
                        ? `Buy with ${selectedOption.label} — Save $${fmt(savings)}`
                        : `Buy for $${fmt(standardPrice)}`}
                </button>
            </>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-navy border border-yellow-900/40 rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
                {step !== 'processing' && step !== 'success' && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
                )}
                {renderContent()}
            </div>
        </div>
    );
};

export default ShopBuyModal;
