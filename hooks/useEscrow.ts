import { useWriteContract, usePublicClient, useReadContracts, useReadContract } from 'wagmi';
import { ESCROW_ABI, ERC721_MINIMAL_ABI, ESCROW_ADDRESS, TIER, type TierValue, parseEscrowError } from '../services/escrowService';

// ── Runtime contract-existence check ─────────────────────────────────────────

/**
 * Reads `shopAddress()` on the escrow contract to confirm it is actually
 * deployed and initialized on the current chain. Returns { deployed, isChecking }.
 *
 * This prevents the UI from treating a plausible-but-empty address (one that
 * passes the format guard in escrowService) as live — e.g. a mistyped address
 * or a deployment that only exists on a different network.
 *
 * The check is skipped (deployed = false) when ESCROW_ADDRESS is empty.
 */
export function useEscrowDeployed(): { deployed: boolean; isChecking: boolean } {
  const enabled = !!ESCROW_ADDRESS;
  const { data: shopAddr, isLoading } = useReadContract({
    address: ESCROW_ADDRESS as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'shopAddress',
    query: { enabled, retry: false },
  });

  if (!enabled) return { deployed: false, isChecking: false };

  // shopAddress returns a non-zero address only if the contract is deployed and initialized
  const deployed = !!shopAddr && shopAddr !== '0x0000000000000000000000000000000000000000';
  return { deployed, isChecking: isLoading };
}

// ── Tier + reward preview (read-only, called before depositing) ───────────────

export interface TierPreview {
  /** Resolved tier value, or null while loading / no escrow configured. */
  tier: TierValue | null;
  /** Whether the reward system is active on the contract (rewardToken != zero). */
  rewardConfigured: boolean;
  /** Expected reward on repayment, in the reward token's base unit (wei). */
  rewardAmount: bigint;
  /** Reward token address (null when not configured). */
  rewardToken: `0x${string}` | null;
  /** Gold multiplier percentage integer (e.g. 150 = 1.5×). */
  goldMultiplier: bigint;
  isLoading: boolean;
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;

/**
 * Reads the current borrower tier and expected repayment reward from the
 * escrow contract. Safe to call before the loan exists on-chain — it uses
 * `getTierForAddress` plus the contract's reward config state variables.
 *
 * Returns a stable null/zero result when the escrow is not deployed or the
 * user's wallet is not connected.
 */
export function useEscrowTierPreview(userAddress?: `0x${string}`): TierPreview {
  const enabled = !!ESCROW_ADDRESS && !!userAddress;
  const escrowAddr = ESCROW_ADDRESS as `0x${string}`;

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: escrowAddr,
        abi: ESCROW_ABI,
        functionName: 'getTierForAddress',
        args: [userAddress ?? ZERO_ADDR],
      },
      { address: escrowAddr, abi: ESCROW_ABI, functionName: 'rewardToken' },
      { address: escrowAddr, abi: ESCROW_ABI, functionName: 'baseRewardAmount' },
      { address: escrowAddr, abi: ESCROW_ABI, functionName: 'goldRewardMultiplier' },
    ],
    query: { enabled },
  });

  if (!data) {
    return { tier: null, rewardConfigured: false, rewardAmount: 0n, rewardToken: null, goldMultiplier: 150n, isLoading: enabled && isLoading };
  }

  const tier         = (data[0].status === 'success' ? data[0].result as number : null) as TierValue | null;
  const rewardTkAddr = (data[1].status === 'success' ? data[1].result as `0x${string}` : ZERO_ADDR);
  const baseReward   = (data[2].status === 'success' ? data[2].result as bigint : 0n);
  const multiplier   = (data[3].status === 'success' ? data[3].result as bigint : 150n);

  const rewardConfigured = !!rewardTkAddr && rewardTkAddr !== ZERO_ADDR && baseReward > 0n;

  let rewardAmount = 0n;
  if (rewardConfigured && tier !== null) {
    if (tier === TIER.GOLD)     rewardAmount = (baseReward * multiplier) / 100n;
    else if (tier === TIER.STANDARD) rewardAmount = baseReward;
  }

  return {
    tier,
    rewardConfigured,
    rewardAmount,
    rewardToken: rewardConfigured ? rewardTkAddr : null,
    goldMultiplier: multiplier,
    isLoading,
  };
}

// ── Borrower hook: approve + deposit NFT into escrow ─────────────────────────

export type DepositStep = 'approving' | 'depositing';

/** Both transaction hashes returned from a successful approveAndDeposit call. */
export interface DepositResult {
  /** Hash of the ERC-721 approve() transaction. */
  approveTxHash: `0x${string}`;
  /** Hash of the depositNFT() transaction — the canonical escrow receipt. */
  depositTxHash: `0x${string}`;
}

export function useEscrowDeposit() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { deployed: contractDeployed } = useEscrowDeployed();

  /**
   * Approve the escrow contract for the NFT, then deposit it.
   * @param numericLoanId  uint256 loan ID (BigInt) stored on-chain and in Firestore.
   * @param nftContract    ERC-721 contract address of the collateral.
   * @param tokenId        Token ID of the collateral.
   * @param onStep         Optional callback to track progress between the two txs.
   * @returns              Both tx hashes for on-screen confirmation and Basescan links.
   * @throws               A human-readable error string via parseEscrowError.
   */
  const approveAndDeposit = async (
    numericLoanId: bigint,
    nftContract: `0x${string}`,
    tokenId: bigint,
    onStep?: (step: DepositStep) => void
  ): Promise<DepositResult> => {
    try {
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed yet.');
      // Runtime guard: verify the contract actually exists on-chain before
      // letting the user sign an approval against a potentially undeployed address.
      const code = await publicClient!.getCode({ address: ESCROW_ADDRESS as `0x${string}` });
      if (!code || code === '0x') {
        throw new Error('Escrow contract not found on this network. Please connect to Base Mainnet.');
      }
      const escrowAddr = ESCROW_ADDRESS as `0x${string}`;

      // 1. Approve escrow to transfer the NFT
      onStep?.('approving');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const approveTxHash = await (writeContractAsync as any)({
        address: nftContract,
        abi: ERC721_MINIMAL_ABI,
        functionName: 'approve',
        args: [escrowAddr, tokenId],
      }) as `0x${string}`;
      await publicClient!.waitForTransactionReceipt({ hash: approveTxHash });

      // 2. Deposit NFT into escrow
      onStep?.('depositing');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const depositTxHash = await (writeContractAsync as any)({
        address: escrowAddr,
        abi: ESCROW_ABI,
        functionName: 'depositNFT',
        args: [numericLoanId, nftContract, tokenId],
      }) as `0x${string}`;
      await publicClient!.waitForTransactionReceipt({ hash: depositTxHash });

      return { approveTxHash, depositTxHash };
    } catch (err) {
      throw new Error(parseEscrowError(err));
    }
  };

  // escrowReady is only true when the address passes the format guard AND the
  // contract is confirmed deployed on the current chain.
  return { approveAndDeposit, escrowReady: !!ESCROW_ADDRESS && contractDeployed };
}

// ── Security hook: pause, blacklist, freeze ───────────────────────────────────

/**
 * Provides the global-pause state and all security write operations exposed
 * by DigiPawnsEscrow v2 (pause/unpause, blacklist, freezeLoan/unfreezeLoan).
 * All writes require the connected wallet to be the contract owner.
 */
export function useEscrowSecurity() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const enabled = !!ESCROW_ADDRESS;
  const addr = ESCROW_ADDRESS as `0x${string}`;

  // Live paused() state — refetches every 10 s so the badge stays fresh.
  const { data: paused, refetch: refetchPaused, isLoading: pausedLoading } = useReadContract({
    address: addr,
    abi: ESCROW_ABI,
    functionName: 'paused',
    query: { enabled, refetchInterval: 10_000 },
  });

  const writeAndWait = async (
    functionName: 'pause' | 'unpause' | 'blacklist' | 'unblacklist' | 'freezeLoan' | 'unfreezeLoan',
    args: readonly unknown[] = []
  ): Promise<void> => {
    if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed yet.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (writeContractAsync as any)({
      address: addr,
      abi: ESCROW_ABI,
      functionName,
      args,
    }) as `0x${string}`;
    await publicClient!.waitForTransactionReceipt({ hash: tx });
  };

  return {
    paused: paused as boolean | undefined,
    pausedLoading,
    refetchPaused,
    pause:       ()                        => writeAndWait('pause'),
    unpause:     ()                        => writeAndWait('unpause'),
    blacklist:   (account: `0x${string}`)  => writeAndWait('blacklist',   [account]),
    unblacklist: (account: `0x${string}`)  => writeAndWait('unblacklist', [account]),
    freezeLoan:  (loanId: bigint)          => writeAndWait('freezeLoan',  [loanId]),
    unfreezeLoan:(loanId: bigint)          => writeAndWait('unfreezeLoan',[loanId]),
    escrowReady: !!ESCROW_ADDRESS,
  };
}

// ── Admin hook: release or sweep from escrow ──────────────────────────────────

export function useEscrowAdmin() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const callEscrow = async (
    functionName: 'releaseToOwner' | 'sweepToShop',
    loanId: bigint
  ): Promise<`0x${string}`> => {
    try {
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed yet.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = await (writeContractAsync as any)({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: ESCROW_ABI,
        functionName,
        args: [loanId],
      }) as `0x${string}`;
      await publicClient!.waitForTransactionReceipt({ hash: tx });
      return tx;
    } catch (err) {
      throw new Error(parseEscrowError(err));
    }
  };

  return {
    releaseToOwner: (loanId: bigint) => callEscrow('releaseToOwner', loanId),
    sweepToShop:    (loanId: bigint) => callEscrow('sweepToShop', loanId),
    escrowReady: !!ESCROW_ADDRESS,
  };
}
