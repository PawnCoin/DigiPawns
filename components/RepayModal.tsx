import React, { useState, useEffect } from 'react';
import type { Loan } from '../types';
import { ArrowUpCircleIcon, CheckCircleIcon, ErrorIcon } from './IconComponents';
import { Spinner, WrongNetworkBanner, PaymentOptionGrid } from './PaymentUI';
import { usePaymentFlow, PAYMENT_OPTIONS, DIG_ADDRESS, PC_ETH_ADDRESS, fmt, fmtTok } from '../hooks/usePaymentFlow';

// ── Props ────────────────────────────────────────────────────────────────────
interface RepayModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan;
    /** Called when Firestore should be updated. Must be async — modal awaits it and shows
     *  a recovery screen (with tx hash) if it throws after an on-chain payment was made. */
    onSuccess: (paymentInfo?: { txHash?: string; token: string; discountPct: number }) => Promise<void> | void;
}

type ModalStep = 'initial' | 'processing' | 'success' | 'error' | 'payment-recorded-failed';

// ── Component ─────────────────────────────────────────────────────────────────
const RepayModal: React.FC<RepayModalProps> = ({ isOpen, onClose, loan, onSuccess }) => {
    const [step, setStep]                 = useState<ModalStep>('initial');
    const [errorMessage, setErrorMessage] = useState('');
    const [savedAmount, setSavedAmount]   = useState(0);
    const [savedToken, setSavedToken]     = useState('');
    // Set when on-chain payment confirmed but Firestore write failed — shown in recovery screen.
    const [txHashForRecovery, setTxHashForRecovery] = useState<string | undefined>();

    const flow = usePaymentFlow({
        standardAmount: loan.repaymentAmount,
        // Loan repayment via store credit never requires an on-chain tx.
        getCreditStatus: () => ({
            available: true,
            note: 'No on-chain tx needed',
            insufficient: false,
            tokenAmount: 0,
        }),
    });

    const { selectedKey, setSelectedKey, selectedOption, discount, discountedAmount, savings,
            tokenPrice, getOptionStatus, executeERC20, executeSPL, evmOptionSelected } = flow;

    const standardAmount = loan.repaymentAmount;

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setStep('initial');
            setErrorMessage('');
            setSelectedKey('credit');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // ── Main confirm handler ─────────────────────────────────────────────────
    const handleConfirm = async () => {
        setStep('processing');
        // Track on-chain tx hash separately so we can surface it in recovery if
        // Firestore recording fails AFTER a successful payment.
        let completedTxHash: string | undefined;
        try {
            if (selectedKey === 'credit') {
                await new Promise(r => setTimeout(r, 700));
            } else if (selectedKey === 'DIG') {
                completedTxHash = await executeERC20(DIG_ADDRESS, discountedAmount, 'DIG');
            } else if (selectedKey === 'PC-ETH') {
                completedTxHash = await executeERC20(PC_ETH_ADDRESS, discountedAmount, 'PC-ETH');
            } else if (selectedKey === 'PC-SOL') {
                completedTxHash = await executeSPL(discountedAmount);
            }

            // Persist to Firestore BEFORE showing success — if this throws, show recovery.
            await onSuccess({ txHash: completedTxHash, token: selectedKey, discountPct: discount });

            setSavedAmount(savings);
            setSavedToken(selectedOption.label);
            setStep('success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (/rejected|denied|user rejected/i.test(msg)) {
                // User cancelled in wallet — return to initial, no error shown.
                setStep('initial');
            } else if (completedTxHash) {
                // On-chain payment confirmed but Firestore update failed.
                // Surface the tx hash so the user can contact support.
                setTxHashForRecovery(completedTxHash);
                setStep('payment-recorded-failed');
            } else {
                setErrorMessage(msg);
                setStep('error');
            }
        }
    };

    // ── Render steps ─────────────────────────────────────────────────────────
    const renderContent = () => {
        if (step === 'processing') return (
            <div className="flex flex-col items-center gap-4 py-8">
                <Spinner />
                <p className="text-gray-300 font-medium">Processing payment…</p>
                <p className="text-gray-500 text-sm text-center">Confirm in your wallet if prompted.<br />Do not close this window.</p>
            </div>
        );

        if (step === 'success') return (
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-semibold text-center">Loan Repaid!</h3>
                {savedAmount > 0 && (
                    <div className="bg-green-950/60 border border-green-800/40 rounded-xl px-6 py-3 text-center">
                        <p className="text-green-300 font-black text-lg">✅ You saved ${fmt(savedAmount)}</p>
                        <p className="text-green-400/80 text-sm">by paying with {savedToken}</p>
                    </div>
                )}
                <p className="text-gray-400 text-center text-sm">Your NFT will be returned to your wallet shortly.</p>
                <button onClick={onClose} className="w-full btn-metallic-gold py-3 rounded-xl font-bold mt-2">Done</button>
            </div>
        );

        if (step === 'error') return (
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                    <ErrorIcon className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-center text-red-300">Payment Failed</h3>
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
                    Your payment went through on-chain, but we couldn't update the loan record. Save your transaction hash and contact support — your repayment will be confirmed manually.
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

        // ── 'initial' step ───────────────────────────────────────────────────
        const currentPrice = tokenPrice(selectedKey);
        const tokenAmount  = currentPrice ? discountedAmount / currentPrice : null;

        return (
            <>
                <WrongNetworkBanner evmOptionSelected={evmOptionSelected} />

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold/20 mb-3">
                    <ArrowUpCircleIcon className="h-7 w-7 text-brand-gold" />
                </div>
                <h3 className="text-2xl font-semibold text-center">Repay Your Loan</h3>
                <p className="text-gray-400 text-center mt-1 text-sm">Choose how you want to pay and reclaim your NFT.</p>

                {/* Loan summary */}
                <div className="mt-5 space-y-2 bg-brand-dark/50 p-4 rounded-xl border border-yellow-900/20">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Asset:</span>
                        <span className="font-medium text-right truncate max-w-[200px]">{loan.nft.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Standard total:</span>
                        <span className={`font-semibold ${discount > 0 ? 'line-through text-gray-600' : 'text-white'}`}>${fmt(standardAmount)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-green-400 font-semibold">With {selectedOption.label} ({Math.round(discount * 100)}% off):</span>
                            <span className="font-bold text-green-300">${fmt(discountedAmount)}</span>
                        </div>
                    )}
                </div>

                {/* Payment options */}
                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-300 mb-2">Pay with:</p>
                    <PaymentOptionGrid
                        options={PAYMENT_OPTIONS}
                        selectedKey={selectedKey}
                        onSelect={setSelectedKey}
                        getOptionStatus={getOptionStatus}
                        creditAlwaysSelectable
                        insufficientLabel={opt => `Insufficient balance — need more ${opt.label.split(' ')[0]}`}
                    />
                </div>

                {/* Token amount preview */}
                {selectedKey !== 'credit' && tokenAmount !== null && (
                    <div className="mt-3 p-3 bg-brand-dark/40 rounded-lg border border-yellow-900/20 flex justify-between items-center text-sm">
                        <span className="text-gray-400">You send:</span>
                        <span className="font-bold text-white">{fmtTok(tokenAmount)} {selectedOption.label}</span>
                    </div>
                )}

                {/* Insufficient balance nudge */}
                {selectedKey !== 'credit' && getOptionStatus(selectedOption).insufficient && (
                    <p className="mt-2 text-xs text-amber-400 text-center">
                        Not enough {selectedOption.label} — swap some first in the Swap tab.
                    </p>
                )}

                <button
                    onClick={handleConfirm}
                    className="w-full btn-metallic-gold py-3 rounded-xl font-bold text-base mt-4"
                >
                    {discount > 0
                        ? `Pay ${selectedOption.label} & Save $${fmt(savings)}`
                        : `Repay $${fmt(standardAmount)}`}
                </button>
            </>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-navy border border-yellow-900/40 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
                {step !== 'processing' && step !== 'success' && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
                )}
                {renderContent()}
            </div>
        </div>
    );
};

export default RepayModal;
