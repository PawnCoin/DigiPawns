import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { usePrices } from '../hooks/usePrices';
import { useTokenBalances } from '../hooks/useTokenBalances';

// ── Token config ─────────────────────────────────────────────────────────────
const DIG_ADDRESS    = '0xf65A4a13D3DE514E1241ba515F0DE2B53eA8394B';
const PC_ETH_ADDRESS = '0x2Fe269292f74F0a98C5786088317B4f86313C211';
const PC_SOL_MINT    = 'EFzKRUaSvLSehersFS12eXS4Nts32Mn9CKhftghFSarE';

export type SwapToken = 'DIG' | 'PC-ETH' | 'PC-SOL';

interface TokenMeta {
    label: string;
    logo: string;
    chain: 'Ethereum' | 'Solana';
    chainColor: string;
    discount: string;
    priceKey: 'dig' | 'pc';
    balKey: 'DIG' | 'PC-ETH' | 'PC-SOL';
}

const TOKEN_META: Record<SwapToken, TokenMeta> = {
    'DIG': {
        label: '$DIG', logo: '/dig-logo.png',
        chain: 'Ethereum', chainColor: '#627eea',
        discount: '25%', priceKey: 'dig', balKey: 'DIG',
    },
    'PC-ETH': {
        label: '$PC', logo: '/pc-logo.png',
        chain: 'Ethereum', chainColor: '#627eea',
        discount: '20%', priceKey: 'pc', balKey: 'PC-ETH',
    },
    'PC-SOL': {
        label: '$PC', logo: '/pc-logo.png',
        chain: 'Solana', chainColor: '#9945ff',
        discount: '20%', priceKey: 'pc', balKey: 'PC-SOL',
    },
};

// Uniswap and Jupiter deep links — pre-fill the output token
const UNI_BASE = 'https://app.uniswap.org/swap';
const EVM_LINKS: Record<'DIG' | 'PC-ETH', { uniswap: string; inch: string }> = {
    'DIG': {
        uniswap: `${UNI_BASE}?inputCurrency=ETH&outputCurrency=${DIG_ADDRESS}&chain=mainnet`,
        inch:    `https://app.1inch.io/#/1/simple/swap/ETH/${DIG_ADDRESS}`,
    },
    'PC-ETH': {
        uniswap: `${UNI_BASE}?inputCurrency=ETH&outputCurrency=${PC_ETH_ADDRESS}&chain=mainnet`,
        inch:    `https://app.1inch.io/#/1/simple/swap/ETH/${PC_ETH_ADDRESS}`,
    },
};
const JUPITER_URL = `https://jup.ag/swap/SOL-${PC_SOL_MINT}`;

// ── Jupiter Terminal types ────────────────────────────────────────────────────
declare global {
    interface Window {
        Jupiter?: {
            init:      (opts: Record<string, unknown>) => void;
            close?:    () => void;
            resume?:   () => void;
            syncProps?: (opts: Record<string, unknown>) => void;
        };
    }
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Token the modal opens on; defaults to 'DIG' */
    defaultToken?: SwapToken;
    /** Called after a successful swap so the caller can trigger a balance refresh */
    onSwapComplete?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTok = (n: number) => {
    if (n === 0) return '0';
    if (n < 0.001) return n.toExponential(2);
    if (n < 1) return n.toFixed(4);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const fmtUsd = (n: number) =>
    '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── SwapModal component ───────────────────────────────────────────────────────
const SwapModal: React.FC<SwapModalProps> = ({ isOpen, onClose, defaultToken = 'DIG', onSwapComplete }) => {
    const [selected, setSelected] = useState<SwapToken>(defaultToken);
    const [spendUsd, setSpendUsd] = useState<string>('100');

    /** When the browser blocks a popup this holds the URL so we can offer a plain link */
    const [blockedUrl, setBlockedUrl] = useState<string | null>(null);

    // Jupiter Terminal embed state
    const [jupLoaded, setJupLoaded]   = useState(false);
    const jupInitted = useRef(false);

    const { prices }   = usePrices();
    const { balances, refetch } = useTokenBalances();

    // Keep a ref so the one-time Jupiter init closure always calls the latest refetch
    const refetchRef = useRef(refetch);
    useEffect(() => { refetchRef.current = refetch; }, [refetch]);

    // Sync defaultToken whenever modal opens; clear any blocked-popup notice
    useEffect(() => {
        if (isOpen) {
            setSelected(defaultToken);
            setSpendUsd('100');
            setBlockedUrl(null);
        }
    }, [isOpen, defaultToken]);

    // Clear blocked-popup notice when the user switches token tabs
    useEffect(() => { setBlockedUrl(null); }, [selected]);

    // ── Jupiter Terminal script injection ─────────────────────────────────────
    useEffect(() => {
        if (!isOpen || selected !== 'PC-SOL') return;
        if (window.Jupiter) { setJupLoaded(true); return; }

        const existing = document.querySelector('script[data-jup-terminal]');
        if (existing) return; // already injected; wait for onload

        const script = document.createElement('script');
        script.src = 'https://terminal.jup.ag/main-v4.js';
        script.async = true;
        script.dataset.jupTerminal = '1';
        script.onload = () => setJupLoaded(true);
        document.head.appendChild(script);
    }, [isOpen, selected]);

    // ── Initialise / resume Jupiter Terminal ──────────────────────────────────
    useEffect(() => {
        if (!isOpen || selected !== 'PC-SOL' || !window.Jupiter) return;

        if (jupInitted.current) {
            window.Jupiter.resume?.();
            return;
        }
        jupInitted.current = true;

        window.Jupiter.init({
            displayMode:        'integrated',
            integratedTargetId: 'jup-terminal-container',
            endpoint:           'https://api.mainnet-beta.solana.com',
            formProps: {
                fixedOutputMint: true,
                initialOutputMint: PC_SOL_MINT,
            },
            onSuccess: ({ txid }: { txid: string }) => {
                console.log('[Jupiter] swap success:', txid);
                onSwapComplete?.();
                // Wait ~2 s for the RPC to index the transaction, then refresh balances
                setTimeout(() => {
                    try {
                        refetchRef.current();
                    } catch (err) {
                        console.error('[Jupiter] balance refetch failed:', err);
                        toast.error('Swap succeeded but balance refresh failed — tap "Done" to retry.');
                    }
                }, 2000);
            },
        });
    }, [jupLoaded, isOpen, selected, onSwapComplete]);

    // ── Derived values ────────────────────────────────────────────────────────
    const meta     = TOKEN_META[selected];
    const price    = prices[meta.priceKey];
    const balance  = balances[meta.balKey];
    const spendNum = parseFloat(spendUsd) || 0;
    const estOut   = price && spendNum > 0 ? spendNum / price : null;

    const openPopup = useCallback((url: string, name: string) => {
        const popup = window.open(url, name, 'width=480,height=700,resizable=yes,scrollbars=yes,noreferrer');
        if (!popup) {
            // Popup was blocked — show an in-modal fallback instead of a second window.open
            setBlockedUrl(url);
        }
    }, []);

    const handleDone = () => {
        onSwapComplete?.();
        onClose();
    };

    if (!isOpen) return null;

    const isEvm    = selected === 'DIG' || selected === 'PC-ETH';
    const evmLinks = isEvm ? EVM_LINKS[selected as 'DIG' | 'PC-ETH'] : null;

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-navy border border-yellow-900/40 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>💱</span> Get Discount Tokens
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Swap for $DIG or $PC to unlock up to 25% off loan fees
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none ml-4">&times;</button>
                </div>

                {/* ── Token tabs ──────────────────────────────────────────── */}
                <div className="flex gap-2 px-6 pb-4 shrink-0">
                    {(['DIG', 'PC-ETH', 'PC-SOL'] as SwapToken[]).map(tok => {
                        const m = TOKEN_META[tok];
                        const active = selected === tok;
                        return (
                            <button
                                key={tok}
                                onClick={() => setSelected(tok)}
                                className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex-1 justify-center
                                    ${active
                                        ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                                        : 'border-yellow-900/30 text-gray-400 hover:border-brand-gold/40 hover:text-gray-200'
                                    }`}
                            >
                                <img src={m.logo} className="w-4 h-4 rounded-full" alt="" />
                                <span>{tok === 'PC-SOL' ? '$PC·SOL' : m.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                <div className="px-6 pb-6 flex flex-col gap-4">

                    {/* Token info banner */}
                    <div className="rounded-xl border border-yellow-900/30 bg-brand-dark/40 p-4 flex items-center gap-4">
                        <img src={meta.logo} alt={meta.label}
                            className="w-12 h-12 rounded-full border border-yellow-900/30 object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-white text-lg">{meta.label}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                    style={{ color: meta.chainColor, background: meta.chainColor + '25', border: `1px solid ${meta.chainColor}40` }}>
                                    {meta.chain}
                                </span>
                                <span className="text-[10px] font-black text-green-400 bg-green-950/60 border border-green-800/40 px-2 py-0.5 rounded-full">
                                    {meta.discount} OFF
                                </span>
                            </div>
                            <div className="text-sm text-gray-400 mt-0.5">
                                {price !== null ? (
                                    <span className="text-white font-semibold">{fmtUsd(price)}</span>
                                ) : (
                                    <span className="text-gray-600">Price loading…</span>
                                )}
                                {balance !== null && (
                                    <span className="ml-2 text-gray-500">· You have {fmtTok(balance)}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quote estimator */}
                    <div className="rounded-xl border border-yellow-900/30 bg-brand-dark/40 p-4">
                        <label className="text-xs font-semibold text-gray-400 block mb-2">
                            {selected === 'PC-SOL' ? 'SOL' : 'ETH'} value you want to spend (USD equivalent)
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm font-semibold">$</span>
                            <input
                                type="number"
                                min="1"
                                step="10"
                                value={spendUsd}
                                onChange={e => setSpendUsd(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-white font-bold text-xl tabular-nums"
                                placeholder="100"
                            />
                        </div>
                        {estOut !== null && (
                            <div className="mt-2 pt-2 border-t border-yellow-900/20 text-sm">
                                <span className="text-gray-500">You get approx.&nbsp;</span>
                                <span className="text-brand-gold font-black">~{fmtTok(estOut)} {meta.label}</span>
                                <span className="text-gray-600 text-xs ml-1">(at current price)</span>
                            </div>
                        )}
                        {!price && (
                            <p className="text-xs text-gray-600 mt-2">Price unavailable — quote will show once prices load.</p>
                        )}
                    </div>

                    {/* ── EVM swap buttons ─────────────────────────────────── */}
                    {isEvm && evmLinks && (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-gray-500 text-center">
                                Choose your preferred DEX — the output token is pre-filled for you.
                                <br />The swap opens in a popup; return here and click&nbsp;
                                <strong className="text-gray-300">Done</strong> to refresh your balances.
                            </p>

                            <button
                                onClick={() => openPopup(evmLinks.uniswap, 'digipawns-uni-swap')}
                                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#FC72FF]/40 bg-[#FC72FF]/10 hover:bg-[#FC72FF]/20 text-white font-bold transition-all"
                            >
                                <span className="text-lg">🦄</span>
                                Swap on Uniswap
                                <span className="text-[10px] text-gray-400 ml-auto">Opens popup ↗</span>
                            </button>

                            <button
                                onClick={() => openPopup(evmLinks.inch, 'digipawns-1inch-swap')}
                                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#1B314F]/60 bg-[#1B314F]/30 hover:bg-[#1B314F]/60 text-white font-bold transition-all"
                            >
                                <span className="text-base font-black text-[#2DC1BF]">1inch</span>
                                Swap on 1inch
                                <span className="text-[10px] text-gray-400 ml-auto">Opens popup ↗</span>
                            </button>
                        </div>
                    )}

                    {/* ── Solana / Jupiter Terminal ─────────────────────────── */}
                    {selected === 'PC-SOL' && (
                        <div className="flex flex-col gap-3">
                            {/* Embedded Jupiter Terminal container */}
                            <div
                                id="jup-terminal-container"
                                className="rounded-xl overflow-hidden border border-purple-900/40 bg-brand-dark/60"
                                style={{ minHeight: 420 }}
                            >
                                {!jupLoaded && (
                                    <div className="flex flex-col items-center justify-center h-[420px] gap-3">
                                        <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-400 rounded-full animate-spin" />
                                        <p className="text-sm text-gray-500">Loading Jupiter Terminal…</p>
                                    </div>
                                )}
                            </div>

                            {/* Fallback external link */}
                            <button
                                onClick={() => openPopup(JUPITER_URL, 'digipawns-jup-swap')}
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-purple-900/40 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
                            >
                                Open on jup.ag instead ↗
                            </button>
                        </div>
                    )}

                    {/* ── Popup-blocked notice ─────────────────────────────── */}
                    {blockedUrl && (
                        <div className="rounded-xl border border-amber-600/40 bg-amber-950/40 p-4 flex flex-col gap-2">
                            <div className="flex items-start gap-2">
                                <span className="text-amber-400 text-lg leading-none shrink-0">⚠️</span>
                                <div>
                                    <p className="text-amber-300 font-semibold text-sm">Popup blocked</p>
                                    <p className="text-amber-200/70 text-xs mt-0.5">
                                        Your browser prevented the swap window from opening.
                                        Allow popups for this site in your browser settings, or use the link below.
                                    </p>
                                </div>
                            </div>
                            <a
                                href={blockedUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-amber-600/50 bg-amber-900/30 hover:bg-amber-900/50 text-amber-200 font-semibold text-sm transition-colors"
                            >
                                Open DEX in new tab ↗
                            </a>
                        </div>
                    )}

                    {/* ── Done button ──────────────────────────────────────── */}
                    <button
                        onClick={handleDone}
                        className="w-full btn-metallic-gold py-3 rounded-xl font-bold text-base mt-1"
                    >
                        Done — Refresh Balances
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SwapModal;
