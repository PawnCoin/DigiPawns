import { useReadContracts, useBalance, useAccount } from 'wagmi';
import { erc20Abi } from 'viem';
import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useAppContext } from '../contexts/AppContext';
import { mainnet, polygon } from 'wagmi/chains';

// DigiPawns token contracts
const DIG_ADDRESS    = '0xf65A4a13D3DE514E1241ba515F0DE2B53eA8394B' as const;
const PC_ETH_ADDRESS = '0x2Fe269292f74F0a98C5786088317B4f86313C211' as const;
const PC_SOL_MINT    = 'EFzKRUaSvLSehersFS12eXS4Nts32Mn9CKhftghFSarE';

/** Raw balance map, keyed by ticker+chain slug used in REPAYMENT_TOKENS */
export interface TokenBalanceMap {
    /** $DIG on Ethereum */
    DIG: number | null;
    /** $PC on Ethereum */
    'PC-ETH': number | null;
    /** $PC on Solana (SPL) */
    'PC-SOL': number | null;
    /** Native ETH */
    ETH: number | null;
    /** Native MATIC */
    MATIC: number | null;
    /** Native SOL */
    SOL: number | null;
}

export interface UseTokenBalancesResult {
    balances: TokenBalanceMap;
    isEvmLoading: boolean;
    isSolLoading: boolean;
    isEvmConnected: boolean;
    isSolanaConnected: boolean;
    /** Manually re-fetch all balances (e.g. after a swap completes). */
    refetch: () => void;
}

function bigintToFloat(raw: bigint, decimals = 18): number {
    // Safe conversion: split at decimal point to avoid float imprecision on large values
    const d = BigInt(10 ** decimals);
    return Number(raw / d) + Number(raw % d) / 10 ** decimals;
}

export function useTokenBalances(): UseTokenBalancesResult {
    const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
    const { isSolanaConnected, solanaAddress } = useAppContext();
    const { connection } = useConnection();

    const enabled = isEvmConnected && !!evmAddress;

    // ── Manual refetch trigger (incremented to force Solana useEffect to re-run) ─
    const [solRefetchTrigger, setSolRefetchTrigger] = useState(0);

    // ── ERC-20 reads ─────────────────────────────────────────────────────────────
    const { data: erc20Data, isLoading: isErc20Loading, refetch: refetchErc20 } = useReadContracts({
        contracts: [
            {
                address: DIG_ADDRESS,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [evmAddress as `0x${string}`],
                chainId: mainnet.id,
            },
            {
                address: PC_ETH_ADDRESS,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [evmAddress as `0x${string}`],
                chainId: mainnet.id,
            },
        ],
        query: { enabled },
    });

    // ── Native balances ───────────────────────────────────────────────────────────
    const { data: ethBal, isLoading: isEthLoading } = useBalance({
        address: evmAddress,
        chainId: mainnet.id,
        query: { enabled },
    });

    const { data: maticBal, isLoading: isMaticLoading } = useBalance({
        address: evmAddress,
        chainId: polygon.id,
        query: { enabled },
    });

    // ── Solana SPL + native SOL ──────────────────────────────────────────────────
    const [pcSolBalance, setPcSolBalance]     = useState<number | null>(null);
    const [nativeSolBalance, setNativeSolBal] = useState<number | null>(null);
    const [isSolLoading, setIsSolLoading]     = useState(false);

    useEffect(() => {
        if (!isSolanaConnected || !solanaAddress) {
            setPcSolBalance(null);
            setNativeSolBal(null);
            return;
        }

        let cancelled = false;
        setIsSolLoading(true);
        // solRefetchTrigger is listed in deps so incrementing it forces a re-fetch
        void solRefetchTrigger;

        let owner: PublicKey;
        let mint: PublicKey;
        try {
            owner = new PublicKey(solanaAddress);
            mint  = new PublicKey(PC_SOL_MINT);
        } catch {
            setIsSolLoading(false);
            return;
        }

        Promise.allSettled([
            connection.getParsedTokenAccountsByOwner(owner, { mint }),
            connection.getBalance(owner),
        ]).then(([tokenRes, solRes]) => {
            if (cancelled) return;
            if (tokenRes.status === 'fulfilled') {
                const uiAmount: number =
                    tokenRes.value.value[0]?.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
                setPcSolBalance(uiAmount);
            }
            if (solRes.status === 'fulfilled') {
                setNativeSolBal(solRes.value / 1e9);
            }
        }).finally(() => {
            if (!cancelled) setIsSolLoading(false);
        });

        return () => { cancelled = true; };
    // solRefetchTrigger increments on manual refetch to force a re-run
    }, [isSolanaConnected, solanaAddress, connection, solRefetchTrigger]);

    // ── Assemble result ──────────────────────────────────────────────────────────
    const digRaw    = erc20Data?.[0]?.result;
    const pcEthRaw  = erc20Data?.[1]?.result;

    const balances: TokenBalanceMap = {
        DIG:      enabled && digRaw   != null ? bigintToFloat(digRaw   as bigint) : null,
        'PC-ETH': enabled && pcEthRaw != null ? bigintToFloat(pcEthRaw as bigint) : null,
        'PC-SOL': isSolanaConnected ? pcSolBalance : null,
        ETH:      enabled && ethBal   ? parseFloat(ethBal.formatted)               : null,
        MATIC:    enabled && maticBal ? parseFloat(maticBal.formatted)             : null,
        SOL:      isSolanaConnected ? nativeSolBalance : null,
    };

    const refetch = useCallback(() => {
        void refetchErc20();
        setSolRefetchTrigger(t => t + 1);
    }, [refetchErc20]);

    return {
        balances,
        isEvmLoading: isErc20Loading || isEthLoading || isMaticLoading,
        isSolLoading,
        isEvmConnected,
        isSolanaConnected,
        refetch,
    };
}
