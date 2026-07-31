/**
 * useSwapQuote — fetches a live DEX quote as the user types.
 *
 * EVM tokens (DIG, PC-ETH): calls the Uniswap v3 QuoterV2 on-chain contract
 *   via viem, trying fee tiers 3000 → 10000 → 500.
 * Solana token (PC-SOL): calls the Jupiter Quote API v6.
 *
 * The input amount (in USD) is debounced 400 ms before any network call.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { mainnet } from 'wagmi/chains';
import type { SwapToken } from '../components/SwapModal';

// ── Constants ──────────────────────────────────────────────────────────────────
const QUOTER_V2_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as `0x${string}`;
const WETH_ADDRESS      = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`;
const DIG_ADDRESS       = '0xf65A4a13D3DE514E1241ba515F0DE2B53eA8394B' as `0x${string}`;
const PC_ETH_ADDRESS    = '0x2Fe269292f74F0a98C5786088317B4f86313C211' as `0x${string}`;
const PC_SOL_MINT       = 'EFzKRUaSvLSehersFS12eXS4Nts32Mn9CKhftghFSarE';
const SOL_NATIVE_MINT   = 'So11111111111111111111111111111111111111112';

// 0.5 % slippage tolerance used for "minimum received" calculation
const SLIPPAGE = 0.005;

// ERC-20 decimals for our known tokens (all 18 — standard)
const EVM_TOKEN_DECIMALS = 18;

// Uniswap v3 fee tiers to try in order: 0.3 %, 1 %, 0.05 %
const FEE_TIERS = [3000, 10000, 500] as const;

const QUOTER_V2_ABI = [
    {
        name: 'quoteExactInputSingle',
        type: 'function',
        stateMutability: 'nonpayable', // QuoterV2 is actually not view — use simulateContract
        inputs: [
            {
                components: [
                    { name: 'tokenIn',           type: 'address'  },
                    { name: 'tokenOut',          type: 'address'  },
                    { name: 'amountIn',          type: 'uint256'  },
                    { name: 'fee',               type: 'uint24'   },
                    { name: 'sqrtPriceLimitX96', type: 'uint256'  },
                ],
                name: 'params',
                type: 'tuple',
            },
        ],
        outputs: [
            { name: 'amountOut',                  type: 'uint256' },
            { name: 'sqrtPriceX96After',          type: 'uint160' },
            { name: 'initializedTicksCrossed',    type: 'uint32'  },
            { name: 'gasEstimate',                type: 'uint256' },
        ],
    },
] as const;

// Viem public client (Ethereum mainnet) — shared module singleton.
// Uses Cloudflare's public RPC which allows cross-origin requests from browsers.
const publicClient = createPublicClient({
    chain: mainnet,
    transport: http('https://cloudflare-eth.com'),
});

// ── Types ──────────────────────────────────────────────────────────────────────
export interface SwapQuote {
    /** Estimated output amount in token units */
    outputAmount: number;
    /** Minimum received after slippage (0.5 %) */
    minimumReceived: number;
    /** Price impact in percent (null if unavailable) */
    priceImpact: number | null;
    /** Which DEX provided this quote */
    source: 'uniswap' | 'jupiter';
}

// Cache PC-SOL token decimals so we only fetch once
let pcSolDecimals: number | null = null;
async function getPcSolDecimals(): Promise<number> {
    if (pcSolDecimals !== null) return pcSolDecimals;
    try {
        const res = await fetch(`https://tokens.jup.ag/token/${PC_SOL_MINT}`);
        if (res.ok) {
            const data = await res.json();
            if (typeof data.decimals === 'number') {
                pcSolDecimals = data.decimals;
                return pcSolDecimals;
            }
        }
    } catch {
        // fall through to default
    }
    pcSolDecimals = 6; // common default for SPL community tokens
    return pcSolDecimals;
}

// ── EVM quote (Uniswap v3 QuoterV2) ───────────────────────────────────────────
async function fetchEvmQuote(
    token: 'DIG' | 'PC-ETH',
    spendUsd: number,
    ethPriceUsd: number,
    spotPriceUsd: number | null,
): Promise<SwapQuote> {
    const tokenOut = token === 'DIG' ? DIG_ADDRESS : PC_ETH_ADDRESS;
    const ethAmount = spendUsd / ethPriceUsd;

    // Clamp to a safe parseable range (max 18 significant digits)
    const amountIn = parseUnits(ethAmount.toFixed(18), 18);

    let amountOut: bigint | null = null;
    for (const fee of FEE_TIERS) {
        try {
            const result = await publicClient.simulateContract({
                address: QUOTER_V2_ADDRESS,
                abi: QUOTER_V2_ABI,
                functionName: 'quoteExactInputSingle',
                args: [{
                    tokenIn:           WETH_ADDRESS,
                    tokenOut:          tokenOut,
                    amountIn,
                    fee,
                    sqrtPriceLimitX96: 0n,
                }],
            });
            amountOut = result.result[0];
            break;
        } catch {
            // try next fee tier
        }
    }

    if (amountOut === null) {
        throw new Error('No Uniswap v3 pool found for this token');
    }

    const outputAmount    = parseFloat(formatUnits(amountOut, EVM_TOKEN_DECIMALS));
    const minimumReceived = outputAmount * (1 - SLIPPAGE);

    // Price impact vs. CoinGecko spot price
    let priceImpact: number | null = null;
    if (spotPriceUsd && spotPriceUsd > 0) {
        const spotOut = spendUsd / spotPriceUsd;
        priceImpact   = ((spotOut - outputAmount) / spotOut) * 100;
    }

    return { outputAmount, minimumReceived, priceImpact, source: 'uniswap' };
}

// ── Solana quote (Jupiter v6) ──────────────────────────────────────────────────
async function fetchJupiterQuote(
    spendUsd: number,
    solPriceUsd: number,
    signal: AbortSignal,
): Promise<SwapQuote> {
    const solAmount = spendUsd / solPriceUsd;
    const lamports  = Math.round(solAmount * 1e9); // SOL has 9 decimals

    const url = new URL('https://quote-api.jup.ag/v6/quote');
    url.searchParams.set('inputMint',   SOL_NATIVE_MINT);
    url.searchParams.set('outputMint',  PC_SOL_MINT);
    url.searchParams.set('amount',      String(lamports));
    url.searchParams.set('slippageBps', '50'); // 0.5 %

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) {
        throw new Error(`Jupiter API error (${res.status})`);
    }
    const data = await res.json();

    const decimals        = await getPcSolDecimals();
    const divisor         = Math.pow(10, decimals);
    const outputAmount    = parseInt(data.outAmount, 10) / divisor;
    const minimumReceived = parseInt(data.otherAmountThreshold, 10) / divisor;
    const priceImpact     = data.priceImpactPct != null
        ? parseFloat(data.priceImpactPct)
        : null;

    return { outputAmount, minimumReceived, priceImpact, source: 'jupiter' };
}

// ── Hook ───────────────────────────────────────────────────────────────────────
/**
 * @param token      Which swap token is selected
 * @param spendUsd   Amount the user wants to spend (in USD)
 * @param prices     Live prices from usePrices (needed to convert USD → native)
 */
export function useSwapQuote(
    token: SwapToken,
    spendUsd: number,
    prices: { eth: number | null; sol: number | null; dig: number | null; pc: number | null },
) {
    const [quote,     setQuote]     = useState<SwapQuote | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error,     setError]     = useState<string | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef    = useRef<AbortController | null>(null);

    const fetchQuote = useCallback(async () => {
        if (spendUsd <= 0) {
            setQuote(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        // Cancel any prior in-flight request
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setIsLoading(true);
        setError(null);

        try {
            let result: SwapQuote;
            if (token === 'DIG' || token === 'PC-ETH') {
                if (!prices.eth) throw new Error('ETH price unavailable');
                const spotPrice = token === 'DIG' ? prices.dig : prices.pc;
                result = await fetchEvmQuote(token, spendUsd, prices.eth, spotPrice);
            } else {
                if (!prices.sol) throw new Error('SOL price unavailable');
                result = await fetchJupiterQuote(spendUsd, prices.sol, ctrl.signal);
            }

            if (!ctrl.signal.aborted) {
                setQuote(result);
                setError(null);
            }
        } catch (err) {
            if (!ctrl.signal.aborted) {
                const msg = err instanceof Error ? err.message : 'Quote failed';
                setError(msg);
                setQuote(null);
            }
        } finally {
            if (!ctrl.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [token, spendUsd, prices]);

    useEffect(() => {
        // Debounce: wait 400 ms after the user stops typing
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchQuote, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            abortRef.current?.abort();
        };
    }, [fetchQuote]);

    // Reset quote when token changes
    useEffect(() => {
        setQuote(null);
        setError(null);
        setIsLoading(false);
    }, [token]);

    return { quote, isLoading, error };
}
