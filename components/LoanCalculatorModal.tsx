import React, { useState, useEffect } from 'react';
import { CalculatorIcon } from './IconComponents';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { usePrices } from '../hooks/usePrices';

interface LoanCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const REPAYMENT_TOKENS = [
  { ticker: 'DIG',     label: '$DIG', logo: '/dig-logo.png',  discount: 0.25, priceKey: 'dig'  as const },
  { ticker: 'PC-ETH',  label: '$PC',  logo: '/pc-logo.png',   discount: 0.20, priceKey: 'pc'   as const },
  { ticker: 'OTHER',   label: 'Other (BTC / ETH / etc.)', logo: null, discount: 0, priceKey: null },
];

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBal = (n: number) => {
    if (n === 0) return '0';
    if (n < 0.0001) return '<0.0001';
    if (n < 1) return n.toFixed(4);
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

const LoanCalculatorModal: React.FC<LoanCalculatorModalProps> = ({ isOpen, onClose }) => {
    const [amount, setAmount]     = useState(10000);
    const [rate, setRate]         = useState(8.5);
    const [term, setTerm]         = useState(30);
    const [tokenIdx, setTokenIdx] = useState(0);

    const [totalInterest, setTotalInterest]   = useState(0);
    const [totalRepayment, setTotalRepayment] = useState(0);

    const { balances, isEvmConnected } = useTokenBalances();
    const { prices, isLoading: isPricesLoading } = usePrices();

    const selectedToken = REPAYMENT_TOKENS[tokenIdx];
    const discount      = selectedToken.discount;

    const discountedInterest  = totalInterest  * (1 - discount);
    const discountedRepayment = totalRepayment - totalInterest + discountedInterest;
    const savings             = totalInterest  - discountedInterest;

    useEffect(() => {
        if (amount > 0 && rate > 0 && term > 0) {
            const dailyRate = rate / 100 / 365;
            const interest  = amount * dailyRate * term;
            setTotalInterest(interest);
            setTotalRepayment(amount + interest);
        } else {
            setTotalInterest(0);
            setTotalRepayment(0);
        }
    }, [amount, rate, term]);

    if (!isOpen) return null;

    const hasDiscount = discount > 0;

    // Resolve token balance and check sufficiency for each discounted token
    const getTokenInfo = (t: typeof REPAYMENT_TOKENS[number]) => {
        if (!t.priceKey || t.ticker === 'OTHER') return null;
        const rawBalance = balances[t.ticker as keyof typeof balances];
        const price      = prices[t.priceKey];
        const usdValue   = rawBalance != null && price != null ? rawBalance * price : null;
        const isSufficient = usdValue !== null ? usdValue >= discountedRepayment : null;
        return { rawBalance, price, usdValue, isSufficient };
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-navy border border-yellow-900/40 rounded-2xl shadow-2xl p-8 w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl leading-none">&times;</button>

                {/* Header */}
                <div className="flex items-center space-x-4 mb-6">
                    <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold/20">
                        <CalculatorIcon className="h-7 w-7 text-brand-gold" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-semibold">Loan Repayment Calculator</h3>
                        <p className="text-gray-400">Estimate your repayment for any loan scenario.</p>
                    </div>
                </div>

                {/* Sliders */}
                <div className="space-y-5">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="font-medium text-gray-300">Loan Amount ($)</label>
                            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                                className="w-32 bg-brand-dark/50 border border-yellow-900/40 rounded-md py-1 px-2 text-right font-semibold text-white" />
                        </div>
                        <input type="range" min="100" max="100000" step="100" value={amount} onChange={e => setAmount(Number(e.target.value))}
                            className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-gold" />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="font-medium text-gray-300">Interest Rate (APR %)</label>
                            <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))}
                                className="w-32 bg-brand-dark/50 border border-yellow-900/40 rounded-md py-1 px-2 text-right font-semibold text-white" />
                        </div>
                        <input type="range" min="1" max="25" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))}
                            className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-gold" />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="font-medium text-gray-300">Term Length (Days)</label>
                            <input type="number" value={term} onChange={e => setTerm(Number(e.target.value))}
                                className="w-32 bg-brand-dark/50 border border-yellow-900/40 rounded-md py-1 px-2 text-right font-semibold text-white" />
                        </div>
                        <input type="range" min="7" max="180" step="1" value={term} onChange={e => setTerm(Number(e.target.value))}
                            className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-gold" />
                    </div>

                    {/* Repayment Token Selector */}
                    <div>
                        <label className="font-medium text-gray-300 block mb-2">Repay with</label>
                        <div className="grid grid-cols-3 gap-2">
                            {REPAYMENT_TOKENS.map((t, i) => {
                                const info = getTokenInfo(t);
                                const isSelected = tokenIdx === i;

                                return (
                                    <div key={t.ticker} className="flex flex-col gap-1">
                                        <button
                                            onClick={() => setTokenIdx(i)}
                                            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-bold transition-all duration-200
                                                ${isSelected
                                                    ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                                                    : 'border-yellow-900/30 text-gray-400 hover:border-brand-gold/40 hover:text-gray-200'
                                                }`}
                                        >
                                            {t.logo ? (
                                                <img src={t.logo} alt={t.label} className="w-7 h-7 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-brand-gray/60 border border-yellow-900/40 flex items-center justify-center">
                                                    <span className="text-[8px] font-bold text-gray-400">ANY</span>
                                                </div>
                                            )}
                                            <span className="leading-none">{t.label}</span>
                                            {t.discount > 0 && (
                                                <span className="text-[9px] font-black text-green-400 leading-none">
                                                    -{Math.round(t.discount * 100)}% OFF
                                                </span>
                                            )}
                                        </button>

                                        {/* Live balance under each token button */}
                                        {info && isEvmConnected && (
                                            <div className={`text-center text-[10px] leading-tight px-1 ${
                                                info.isSufficient === false
                                                    ? 'text-red-400/80'
                                                    : info.isSufficient === true
                                                    ? 'text-green-400/80'
                                                    : 'text-gray-500'
                                            }`}>
                                                {info.rawBalance !== null ? (
                                                    <>
                                                        <div className="font-semibold tabular-nums">{fmtBal(info.rawBalance)} {t.label}</div>
                                                        {info.usdValue !== null && (
                                                            <div className="text-gray-600">${fmt(info.usdValue)}</div>
                                                        )}
                                                        {info.isSufficient === false && (
                                                            <div className="text-red-400/80 font-bold">Insufficient</div>
                                                        )}
                                                    </>
                                                ) : isPricesLoading ? (
                                                    <span>Loading…</span>
                                                ) : (
                                                    <span>0 {t.label}</span>
                                                )}
                                            </div>
                                        )}
                                        {info && !isEvmConnected && (
                                            <div className="text-center text-[10px] text-gray-600">No wallet</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="mt-6 rounded-xl overflow-hidden border border-yellow-900/30">
                    {/* Discount savings banner */}
                    {hasDiscount && savings > 0 && (
                        <div className="flex items-center justify-between px-4 py-2.5 bg-green-950/60 border-b border-green-800/40">
                            <span className="text-green-400 text-sm font-semibold flex items-center gap-1.5">
                                🎉 You save with {selectedToken.label}
                            </span>
                            <span className="text-green-300 font-black text-base">${fmt(savings)}</span>
                        </div>
                    )}

                    <div className="bg-brand-dark/40 p-4 space-y-3">
                        {/* Standard interest (struck through if discounted) */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Standard Interest:</span>
                            <span className={`font-medium ${hasDiscount ? 'line-through text-gray-600' : 'text-white'}`}>
                                ${fmt(totalInterest)}
                            </span>
                        </div>

                        {/* Discounted interest */}
                        {hasDiscount && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-green-400 font-semibold">
                                    Interest with {selectedToken.label} ({Math.round(discount * 100)}% off):
                                </span>
                                <span className="font-bold text-green-300">${fmt(discountedInterest)}</span>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="border-t border-yellow-900/20" />

                        {/* Standard repayment (struck if discounted) */}
                        {hasDiscount && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Standard Total:</span>
                                <span className="line-through text-gray-600">${fmt(totalRepayment)}</span>
                            </div>
                        )}

                        {/* Final repayment */}
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-bold text-lg">
                                {hasDiscount ? `Total with ${selectedToken.label}:` : 'Total Repayment:'}
                            </span>
                            <span className={`font-black text-2xl ${hasDiscount ? 'text-metallic-gold' : 'text-brand-gold'}`}>
                                ${fmt(hasDiscount ? discountedRepayment : totalRepayment)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                {hasDiscount && (
                    <p className="mt-3 text-center text-xs text-gray-500">
                        Discount applied automatically at checkout when repaying with {selectedToken.label}.
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoanCalculatorModal;
