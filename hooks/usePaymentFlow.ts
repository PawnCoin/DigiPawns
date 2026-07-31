/**
 * usePaymentFlow — shared payment logic for ShopBuyModal and RepayModal.
 *
 * Encapsulates:
 *  - Payment option definitions (types, constants)
 *  - Selected-option state
 *  - tokenPrice / getOptionStatus helpers
 *  - executeERC20 / executeSPL transfer functions
 *  - Derived amounts (discount, discountedAmount, savings)
 *
 * Each consuming modal supplies `standardAmount` and a `getCreditStatus`
 * callback because the two modals treat the "Store Credit" option differently.
 */

import { useWriteContract, usePublicClient } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { parseUnits } from 'viem';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey } from '@solana/web3.js';
// NOTE: @solana/spl-token is dynamically imported inside executeSPL to avoid its Buffer
// global reference running before the index.tsx polyfill (ES module loading order issue).
import { useState } from 'react';
import { useTokenBalances } from './useTokenBalances';
import { usePrices } from './usePrices';
import { useAppContext } from '../contexts/AppContext';

// ── Token addresses ──────────────────────────────────────────────────────────
export const DIG_ADDRESS     = '0xf65A4a13D3DE514E1241ba515F0DE2B53eA8394B' as `0x${string}`;
export const PC_ETH_ADDRESS  = '0x2Fe269292f74F0a98C5786088317B4f86313C211' as `0x${string}`;
export const PC_SOL_MINT     = 'EFzKRUaSvLSehersFS12eXS4Nts32Mn9CKhftghFSarE';

// ── Platform wallets from env ────────────────────────────────────────────────
export const PLATFORM_EVM_WALLET  = (process.env.PLATFORM_WALLET  || '') as `0x${string}`;
export const PLATFORM_SOL_WALLET  = process.env.PLATFORM_SOL_WALLET || '';
export const EVM_PAYMENTS_ENABLED = PLATFORM_EVM_WALLET.startsWith('0x') && PLATFORM_EVM_WALLET.length === 42;
export const SOL_PAYMENTS_ENABLED = PLATFORM_SOL_WALLET.length > 10;

// ── Minimal ERC-20 ABI ───────────────────────────────────────────────────────
export const ERC20_ABI = [
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
export type PayKey = 'credit' | 'DIG' | 'PC-ETH' | 'PC-SOL';

export interface PaymentOption {
    key: PayKey;
    label: string;
    logo: string | null;
    discount: number;
    chain: 'evm' | 'sol' | 'credit';
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
    { key: 'credit',  label: 'Store Credit', logo: null,            discount: 0,    chain: 'credit' },
    { key: 'DIG',     label: '$DIG',         logo: '/dig-logo.png', discount: 0.25, chain: 'evm'    },
    { key: 'PC-ETH',  label: '$PC (ETH)',    logo: '/pc-logo.png',  discount: 0.20, chain: 'evm'    },
    { key: 'PC-SOL',  label: '$PC (SOL)',    logo: '/pc-logo.png',  discount: 0.20, chain: 'sol'    },
];

// ── Formatting helpers ───────────────────────────────────────────────────────
export const fmt    = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtTok = (n: number) =>
    n < 0.001 ? '<0.001' : n.toLocaleString(undefined, { maximumFractionDigits: 4 });

// ── Option status shape ──────────────────────────────────────────────────────
export interface OptionStatus {
    available: boolean;
    note: string;
    insufficient: boolean;
    tokenAmount: number;
}

// ── Hook params ──────────────────────────────────────────────────────────────
export interface UsePaymentFlowParams {
    /** The full (non-discounted) amount the user owes, in USD. */
    standardAmount: number;
    /**
     * Determines availability of the "Store Credit" option.
     * Each modal has different credit semantics so this is injected.
     */
    getCreditStatus: () => OptionStatus;
}

// ── Hook return ──────────────────────────────────────────────────────────────
export interface UsePaymentFlowReturn {
    // State
    selectedKey: PayKey;
    setSelectedKey: (key: PayKey) => void;

    // Derived amounts
    selectedOption: PaymentOption;
    discount: number;
    discountedAmount: number;
    savings: number;

    // Helpers
    tokenPrice: (key: PayKey) => number | null;
    getOptionStatus: (opt: PaymentOption) => OptionStatus;

    // On-chain transfer executors (both throw on failure)
    executeERC20: (tokenAddr: `0x${string}`, amountUsd: number, priceKey: PayKey) => Promise<string>;
    executeSPL:   (amountUsd: number) => Promise<string>;

    // Convenience flag
    evmOptionSelected: boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function usePaymentFlow({ standardAmount, getCreditStatus }: UsePaymentFlowParams): UsePaymentFlowReturn {
    const [selectedKey, setSelectedKey] = useState<PayKey>('credit');

    const { isSolanaConnected, isWalletConnected } = useAppContext();
    const { balances }           = useTokenBalances();
    const { prices }             = usePrices();
    const { writeContractAsync } = useWriteContract();
    const publicClient           = usePublicClient({ chainId: mainnet.id });
    const { sendTransaction, publicKey: solPublicKey } = useSolanaWallet();
    const { connection }         = useConnection();

    const selectedOption  = PAYMENT_OPTIONS.find(o => o.key === selectedKey)!;
    const discount        = selectedOption.discount;
    const discountedAmount = standardAmount * (1 - discount);
    const savings         = standardAmount - discountedAmount;
    const evmOptionSelected = selectedOption.chain === 'evm';

    // ── Token price for a given key ──────────────────────────────────────────
    const tokenPrice = (key: PayKey): number | null => {
        if (key === 'DIG')                    return prices.dig ?? null;
        if (key === 'PC-ETH' || key === 'PC-SOL') return prices.pc ?? null;
        return null;
    };

    // ── Per-option availability ──────────────────────────────────────────────
    const getOptionStatus = (opt: PaymentOption): OptionStatus => {
        if (opt.key === 'credit') return getCreditStatus();

        if (opt.chain === 'evm' && !EVM_PAYMENTS_ENABLED) return { available: false, note: 'Not configured',    insufficient: false, tokenAmount: 0 };
        if (opt.chain === 'sol' && !SOL_PAYMENTS_ENABLED) return { available: false, note: 'Not configured',    insufficient: false, tokenAmount: 0 };
        if (opt.chain === 'evm' && !isWalletConnected)    return { available: false, note: 'No EVM wallet',     insufficient: false, tokenAmount: 0 };
        if (opt.chain === 'sol' && !isSolanaConnected)    return { available: false, note: 'No Solana wallet',  insufficient: false, tokenAmount: 0 };

        const price = tokenPrice(opt.key);
        if (!price) return { available: false, note: 'Price unavailable', insufficient: false, tokenAmount: 0 };

        const raw         = balances[opt.key as keyof typeof balances] ?? 0;
        const usdValue    = raw * price;
        const tokenAmount = discountedAmount / price;
        const insufficient = usdValue < discountedAmount;

        return {
            available: !insufficient,
            note: `${fmtTok(raw)} ≈ $${fmt(usdValue)}`,
            insufficient,
            tokenAmount,
        };
    };

    // ── ERC-20 transfer ──────────────────────────────────────────────────────
    const executeERC20 = async (
        tokenAddr: `0x${string}`,
        amountUsd: number,
        priceKey: PayKey,
    ): Promise<string> => {
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
    const executeSPL = async (amountUsd: number): Promise<string> => {
        if (!solPublicKey)         throw new Error('Solana wallet not connected.');
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
            userAta, mint, platformAta, solPublicKey, rawAmt, decimals,
        );
        const tx = new Transaction().add(instruction);
        const txHash = await sendTransaction(tx, connection);
        await connection.confirmTransaction(txHash, 'confirmed');
        return txHash;
    };

    return {
        selectedKey,
        setSelectedKey,
        selectedOption,
        discount,
        discountedAmount,
        savings,
        tokenPrice,
        getOptionStatus,
        executeERC20,
        executeSPL,
        evmOptionSelected,
    };
}
