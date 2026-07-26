import React from 'react';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { usePrices } from '../hooks/usePrices';
import { useAppContext } from '../contexts/AppContext';

interface TokenRow {
    key: keyof ReturnType<typeof useTokenBalances>['balances'];
    label: string;
    chain: string;
    chainColor: string;
    logo: string | null;
    priceKey: keyof ReturnType<typeof usePrices>['prices'];
}

const TOKEN_ROWS: TokenRow[] = [
    { key: 'DIG',      label: '$DIG',  chain: 'Ethereum', chainColor: '#627eea', logo: '/dig-logo.png',  priceKey: 'dig'   },
    { key: 'PC-ETH',   label: '$PC',   chain: 'Ethereum', chainColor: '#627eea', logo: '/pc-logo.png',   priceKey: 'pc'    },
    { key: 'PC-SOL',   label: '$PC',   chain: 'Solana',   chainColor: '#9945ff', logo: '/pc-logo.png',   priceKey: 'pc'    },
    { key: 'ETH',      label: 'ETH',   chain: 'Ethereum', chainColor: '#627eea', logo: null,             priceKey: 'eth'   },
    { key: 'MATIC',    label: 'MATIC', chain: 'Polygon',  chainColor: '#8247e5', logo: null,             priceKey: 'matic' },
    { key: 'SOL',      label: 'SOL',   chain: 'Solana',   chainColor: '#9945ff', logo: null,             priceKey: 'sol'   },
];

const NATIVE_ICONS: Record<string, string> = {
    ETH: '⬡',
    MATIC: '◈',
    SOL: '◎',
};

const fmtBalance = (n: number): string => {
    if (n === 0) return '0';
    if (n < 0.0001) return '<0.0001';
    if (n < 1) return n.toFixed(4);
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

const fmtUsd = (n: number): string => {
    if (n < 0.01) return '<$0.01';
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPrice = (n: number): string => {
    if (n >= 1) return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 0.0001) return '$' + n.toFixed(6);
    return '<$0.000001';
};

const Skeleton: React.FC = () => (
    <span className="inline-block w-16 h-3 bg-gray-700/60 rounded animate-pulse" />
);

const TokenBalancesCard: React.FC = () => {
    const { balances, isEvmLoading, isSolLoading, isEvmConnected, isSolanaConnected } = useTokenBalances();
    const { prices, isLoading: isPricesLoading, lastUpdated, refresh } = usePrices();
    const { openWalletPicker } = useAppContext();

    const neitherConnected = !isEvmConnected && !isSolanaConnected;

    const renderBalance = (row: TokenRow) => {
        const isLoading = row.chain === 'Solana' ? isSolLoading : isEvmLoading;
        const isConnected = row.chain === 'Solana' ? isSolanaConnected : isEvmConnected;
        const balance = balances[row.key];
        const price   = prices[row.priceKey];

        if (!isConnected) {
            return <span className="text-gray-600 text-sm">—</span>;
        }
        if (isLoading) {
            return <Skeleton />;
        }
        return (
            <div className="text-right">
                <div className="text-white font-semibold text-sm tabular-nums">
                    {balance !== null ? fmtBalance(balance) : '—'}
                </div>
                <div className="text-gray-500 text-xs">
                    {balance !== null && price !== null
                        ? fmtUsd(balance * price)
                        : price !== null
                        ? '—'
                        : <span className="text-gray-600">price N/A</span>
                    }
                </div>
            </div>
        );
    };

    return (
        <div className="mb-6 rounded-xl border border-yellow-900/30 bg-brand-navy/60 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-yellow-900/20">
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                    💰 Token Balances
                </h3>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-xs text-gray-600">
                            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={refresh}
                        title="Refresh prices"
                        className="text-gray-500 hover:text-brand-gold transition-colors text-xs font-semibold"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {neitherConnected ? (
                /* No wallets — prompt */
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                        <p className="text-sm text-gray-300 font-semibold">No wallet connected</p>
                        <p className="text-xs text-gray-500 mt-0.5">Connect EVM or Solana wallet to see live balances.</p>
                    </div>
                    <button
                        onClick={openWalletPicker}
                        className="btn-metallic-gold text-xs font-bold py-1.5 px-3 rounded-lg whitespace-nowrap"
                    >
                        Connect Wallet
                    </button>
                </div>
            ) : (
                <div className="divide-y divide-yellow-900/10">
                    {TOKEN_ROWS.map(row => {
                        const isConnected = row.chain === 'Solana' ? isSolanaConnected : isEvmConnected;
                        const price = prices[row.priceKey];

                        return (
                            <div
                                key={`${row.key}-${row.chain}`}
                                className={`flex items-center justify-between px-5 py-3 transition-colors ${!isConnected ? 'opacity-40' : 'hover:bg-white/2'}`}
                            >
                                {/* Left: token logo + label + chain */}
                                <div className="flex items-center gap-3">
                                    {row.logo ? (
                                        <img src={row.logo} alt={row.label} className="w-7 h-7 rounded-full border border-yellow-900/40 object-cover" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-brand-dark/60 border border-yellow-900/30 text-base">
                                            {NATIVE_ICONS[row.label] || '?'}
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-white font-semibold text-sm">{row.label}</span>
                                        <span
                                            className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                            style={{ color: row.chainColor, background: row.chainColor + '25', border: `1px solid ${row.chainColor}40` }}
                                        >
                                            {row.chain}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: balance + USD value | live price */}
                                <div className="flex items-center gap-6">
                                    {/* Live price */}
                                    <div className="hidden sm:block text-right">
                                        <div className="text-xs text-gray-500">Price</div>
                                        <div className="text-xs text-gray-400 font-mono tabular-nums">
                                            {isPricesLoading
                                                ? <Skeleton />
                                                : price !== null
                                                ? fmtPrice(price)
                                                : <span className="text-gray-600">N/A</span>
                                            }
                                        </div>
                                    </div>

                                    {/* Balance + USD value */}
                                    {renderBalance(row)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TokenBalancesCard;
