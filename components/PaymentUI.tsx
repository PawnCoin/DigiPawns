/**
 * Shared UI primitives used by ShopBuyModal and RepayModal.
 *
 * Keeping these here avoids duplicating small, identical components in every
 * payment-flow modal.
 */

import React from 'react';
import { useAppContext } from '../contexts/AppContext';

// ── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-brand-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
);

// ── WrongNetworkBanner ───────────────────────────────────────────────────────
/**
 * Displays a warning banner when the user's EVM wallet is on the wrong chain.
 * Renders nothing when the condition is not met.
 */
export const WrongNetworkBanner: React.FC<{ evmOptionSelected: boolean }> = ({ evmOptionSelected }) => {
    const { isWalletConnected, isCorrectChain, switchToCorrectChain } = useAppContext();

    if (!isWalletConnected || isCorrectChain || !evmOptionSelected) return null;

    return (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-700/50 bg-red-900/20 px-4 py-3">
            <p className="text-xs text-red-300 font-medium">
                ⚠ Wrong network — switch to a supported chain to pay with an EVM token.
            </p>
            <button
                onClick={switchToCorrectChain}
                className="flex-shrink-0 text-xs font-bold text-red-200 border border-red-700/60 rounded-lg px-2.5 py-1 hover:bg-red-900/40 transition-colors"
            >
                Switch
            </button>
        </div>
    );
};

// ── PaymentOptionGrid ────────────────────────────────────────────────────────
import type { PaymentOption, PayKey, OptionStatus } from '../hooks/usePaymentFlow';

interface PaymentOptionGridProps {
    options: PaymentOption[];
    selectedKey: PayKey;
    onSelect: (key: PayKey) => void;
    getOptionStatus: (opt: PaymentOption) => OptionStatus;
    /** When true, credit option is always selectable even if insufficient */
    creditAlwaysSelectable?: boolean;
    insufficientLabel?: (opt: PaymentOption) => string;
}

export const PaymentOptionGrid: React.FC<PaymentOptionGridProps> = ({
    options,
    selectedKey,
    onSelect,
    getOptionStatus,
    creditAlwaysSelectable = false,
    insufficientLabel,
}) => (
    <div className="grid grid-cols-2 gap-2">
        {options.map(opt => {
            const status     = getOptionStatus(opt);
            const isSelected = selectedKey === opt.key;
            const isDisabled = creditAlwaysSelectable && opt.key === 'credit'
                ? false
                : !status.available;

            return (
                <button
                    key={opt.key}
                    onClick={() => !isDisabled && onSelect(opt.key)}
                    disabled={isDisabled}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all duration-150
                        ${isSelected ? 'border-brand-gold bg-brand-gold/10' : 'border-yellow-900/30 hover:border-brand-gold/40'}
                        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    <div className="flex items-center gap-2 w-full">
                        {opt.logo ? (
                            <img src={opt.logo} alt={opt.label} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-[6px] font-bold text-brand-gold">SC</span>
                            </div>
                        )}
                        <span className={`text-xs font-bold flex-1 ${isSelected ? 'text-brand-gold' : 'text-gray-300'}`}>{opt.label}</span>
                        {opt.discount > 0 && (
                            <span className="text-[9px] font-black text-green-400">-{Math.round(opt.discount * 100)}%</span>
                        )}
                    </div>
                    <div className="pl-7 text-[10px] leading-tight">
                        {status.insufficient ? (
                            <span className="text-red-400">
                                {insufficientLabel ? insufficientLabel(opt) : `Insufficient — ${status.note}`}
                            </span>
                        ) : (
                            <span className="text-gray-500">{status.note}</span>
                        )}
                    </div>
                </button>
            );
        })}
    </div>
);
