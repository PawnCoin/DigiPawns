import React, { useState, useEffect } from 'react';
import type { ShopItem } from '../types';
import { CheckCircleIcon, ErrorIcon } from './IconComponents';
import { useWriteContract, usePublicClient } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { parseUnits } from 'viem';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey } from '@solana/web3.js';
// NOTE: @solana/spl-token is dynamically imported inside executeSPL to avoid its Buffer
// global reference running before the index.tsx polyfill (ES module loading order issue).
import { useTokenBalances } from '../hooks/useTokenBalances';
import { usePrices } from '../hooks/usePrices';
import { useAppContext } from '../contexts/AppContext';

// ── Token addresses ──────────────────────────────────────────────────────────
const DIG_ADDRESS    = '0xf65A4a13D3DE514E1241ba515F0DE2B53eA8394B' as `0x${string}`;
const PC_ETH_ADDRESS = '0x2Fe269292f74F0a98C5786088317B4f86313C211' as `0x${string}`;
const PC_SOL_MINT    = 'EFzKRUaSvLSehersFS12eXS4Nts32Mn9CKhftghFSarE';

// ── Platform wallets from env ────────────────────────────────────────────────
const PLATFORM_EVM_WALLET  = (process.env.PLATFORM_WALLET  || '') as `0x${string}`;
const PLATFORM_SOL_WALLET  = process.env.PLATFORM_SOL_WALLET || '';
const EVM_PAYMENTS_ENABLED = PLATFORM_EVM_WALLET.startsWith('0x') && PLATFORM_EVM_WALLET.length === 42;
const SOL_PAYMENTS_ENABLED = PLATFORM_SOL_WALLET.length > 10;

// ── Minimal ERC-20 ABI ───────────────────────────────────────────────────────
const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function' as const,
        stateMutability: 'nonpayable' as const,
        inputs: [
            { name: 'to',     type: 'address' as const },
            { name: 'amount', type: 'uint256' as const },
        ],
        outputs: [{ name: '', type: 'bool' as const }],
    },
] as const;

// ── Payment option definitions ───────────────────────────────────────────────
type PayKey = 'credit' | 'DIG' | 'PC-ETH' | 'PC-SOL';
interface PaymentOption {
    key: PayKey;
    label: string;
    logo: string | null;
    discount: number;
    chain: 'evm' | 'sol' | 'credit';
}
const PAYMENT_OPTIONS: PaymentOption[] = [
    { key: 'credit',  label: 'Store Credit', logo: null,            discount: 0,    chain: 'credit' },
    { key: 'DIG',     label: '$DIG',         logo: '/dig-logo.png', discount: 0.25, chain: 'evm'    },
    { key: 'PC-ETH',  label: '$PC (ETH)',    logo: '/pc-logo.png',  discount: 0.20, chain: 'evm'    },
    { key: 'PC-SOL',  label: '$PC (SOL)',    logo: '/pc-logo.png',  discount: 0.20, chain: 'sol'    },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt    = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTok = (n: number) => n < 0.001 ? '<0.001' : n.toLocaleString(undefined, { maximumFractionDigits: 4 });

const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-brand-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
);

// ── Props ────────────────────────────────────────────────────────────────────
interface ShopBuyModalProps {
    item: ShopItem;
    onClose: () => void;
}

type ModalStep = 'initial' | 'processing' | 'success' | 'error' | 'payment-recorded-failed';

// ── Component ─────────────────────────────────────────────────────────────────
const ShopBuyModal: React.FC<ShopBuyModalProps> = ({ item, onClose }) => {
    const [step, setStep]             = useState<ModalStep>('initial');
    const [selectedKey, setSelectedKey] = useState<PayKey>('credit');
    const [errorMessage, setErrorMessage] = useState('');
    const [savedAmount, setSavedAmount]   = useState(0);
    const [savedToken, setSavedToken]     = useState('');
    // Set when the on-chain payment succeeded but Firestore recording failed.
    // User must note the tx hash to contact support.
    const [txHashForRecovery, setTxHashForRecovery] = useState<string | undefined>();

    const { isSolanaConnected, isWalletConnected, isCorrectChain, switchToCorrectChain, buyShopItem, profile } = useAppContext();
    const { balances }            = useTokenBalances();
    const { prices }              = usePrices();
    const { writeContractAsync }  = useWriteContract();
    const publicClient            = usePublicClient({ chainId: mainnet.id });
    const { sendTransaction, publicKey: solPublicKey } = useSolanaWallet();
    const { connection }          = useConnection();

    const STARTING_BALANCE = 25000;
    const storeCredit = profile.balance ?? STARTING_BALANCE;

    // Reset on mount
    useEffect(() => {
        setStep('initial');
        setErrorMessage('');
        setSelectedKey('credit');
    }, [item.id]);

    const selectedOption   = PAYMENT_OPTIONS.find(o => o.key === selectedKey)!;
    const discount         = selectedOption.discount;
    const standardPrice    = item.price;
    const discountedPrice  = standardPrice * (1 - discount);
    const savings          = standardPrice - discountedPrice;

    // ── Token price for a given key ──────────────────────────────────────────
    const tokenPrice = (key: PayKey): number | null => {
        if (key === 'DIG')   return prices.dig ?? null;
        if (key === 'PC-ETH' || key === 'PC-SOL') return prices.pc ?? null;
        return null;
    };

    // ── Per-option status ────────────────────────────────────────────────────
    const getOptionStatus = (opt: PaymentOption) => {
        if (opt.key === 'credit') {
            const insufficient = storeCredit < standardPrice;
            return {
                available: !insufficient,
                note: `Balance: $${storeCredit.toLocaleString()}`,
                insufficient,
                tokenAmount: 0,
            };
        }
        if (opt.chain === 'evm' && !EVM_PAYMENTS_ENABLED) return { available: false, note: 'Not configured', insufficient: false, tokenAmount: 0 };
        if (opt.chain === 'sol' && !SOL_PAYMENTS_ENABLED) return { available: false, note: 'Not configured', insufficient: false, tokenAmount: 0 };
        if (opt.chain === 'evm' && !isWalletConnected)    return { available: false, note: 'No EVM wallet',  insufficient: false, tokenAmount: 0 };
        if (opt.chain === 'sol' && !isSolanaConnected)    return { available: false, note: 'No Solana wallet', insufficient: false, tokenAmount: 0 };

        const price = tokenPrice(opt.key);
        if (!price) return { available: false, note: 'Price unavailable', insufficient: false, tokenAmount: 0 };

        const raw          = balances[opt.key as keyof typeof balances] ?? 0;
        const usdValue     = raw * price;
        const tokenAmount  = discountedPrice / price;
        const insufficient = usdValue < discountedPrice;

        return {
            available: !insufficient,
            note: `${fmtTok(raw)} ≈ $${fmt(usdValue)}`,
            insufficient,
            tokenAmount,
        };
    };

    // ── ERC-20 transfer ──────────────────────────────────────────────────────
    const executeERC20 = async (tokenAddr: `0x${string}`, amountUsd: number, priceKey: PayKey) => {
        const price = tokenPrice(priceKey);
        if (!price) throw new Error('Token price unavailable — please try again.');
        if (!EVM_PAYMENTS_ENABLED) throw new Error('Platform wallet not configured.');
        const tokenAmt  = amountUsd / price;
        const amountWei = parseUnits(tokenAmt.toFixed(6), 18);
        const txHash = await (writeContractAsync as any)({
            address: tokenAddr,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [PLATFORM_EVM_WALLET, amountWei],
            chainId: mainnet.id,
        }) as `0x${string}`;
        // Wait for on-chain finality before treating payment as complete.
        const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== 'success') {
            throw new Error('Transaction reverted on-chain. No funds were deducted — please try again.');
        }
        return txHash as string;
    };

    // ── SPL token transfer ───────────────────────────────────────────────────
    const executeSPL = async (amountUsd: number) => {
        if (!solPublicKey)     throw new Error('Solana wallet not connected.');
        if (!SOL_PAYMENTS_ENABLED) throw new Error('Platform Solana wallet not configured.');
        const price = tokenPrice('PC-SOL');
        if (!price) throw new Error('$PC price unavailable — please try again.');

        // Dynamic import: @solana/spl-token uses Buffer as a global. Loading it
        // lazily (inside an async fn) ensures the index.tsx Buffer polyfill has
        // already run before this module initialises.
        const { getAssociatedTokenAddress, createTransferCheckedInstruction, getMint } =
            await import('@solana/spl-token');

        const mint        = new PublicKey(PC_SOL_MINT);
        const platformPub = new PublicKey(PLATFORM_SOL_WALLET);
        const mintInfo    = await getMint(connection, mint);
        const decimals    = mintInfo.decimals;
        const rawAmt      = BigInt(Math.round((amountUsd / price) * 10 ** decimals));

        const [userAta, platformAta] = await Promise.all([
            getAssociatedTokenAddress(mint, solPublicKey),
            getAssociatedTokenAddress(mint, platformPub),
        ]);

        const instruction = createTransferCheckedInstruction(
            userAta, mint, platformAta, solPublicKey, rawAmt, decimals
        );
        const tx = new Transaction().add(instruction);
        const txHash = await sendTransaction(tx, connection);
        await connection.confirmTransaction(txHash, 'confirmed');
        return txHash;
    };

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
                completedTxHash = await executeERC20(DIG_ADDRESS, discountedPrice, 'DIG');
                paymentInfo = { txHash: completedTxHash, token: 'DIG', discountPct: discount };
                await buyShopItem(item.id, paymentInfo); // throws if Firestore write fails
            } else if (selectedKey === 'PC-ETH') {
                completedTxHash = await executeERC20(PC_ETH_ADDRESS, discountedPrice, 'PC-ETH');
                paymentInfo = { txHash: completedTxHash, token: 'PC-ETH', discountPct: discount };
                await buyShopItem(item.id, paymentInfo);
            } else if (selectedKey === 'PC-SOL') {
                completedTxHash = await executeSPL(discountedPrice);
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
        const tokenAmt     = currentPrice ? discountedPrice / currentPrice : null;
        const evmOptionSelected = selectedOption.chain === 'evm';

        return (
            <>
                {/* Wrong-network warning */}
                {isWalletConnected && !isCorrectChain && evmOptionSelected && (
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
                )}
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
                            <span className="font-bold text-green-300">${fmt(discountedPrice)}</span>
                        </div>
                    )}
                </div>

                {/* Payment options */}
                <p className="text-sm font-medium text-gray-300 mb-2">Pay with:</p>
                <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_OPTIONS.map(opt => {
                        const status     = getOptionStatus(opt);
                        const isSelected = selectedKey === opt.key;
                        const isDisabled = !status.available;

                        return (
                            <button
                                key={opt.key}
                                onClick={() => !isDisabled && setSelectedKey(opt.key)}
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
                                        <span className="text-red-400">Insufficient — {status.note}</span>
                                    ) : (
                                        <span className="text-gray-500">{status.note}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

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
