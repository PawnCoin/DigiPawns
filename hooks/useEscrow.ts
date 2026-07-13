import { useWriteContract, usePublicClient } from 'wagmi';
import { ESCROW_ABI, ERC721_MINIMAL_ABI, ESCROW_ADDRESS } from '../services/escrowService';

// ── Borrower hook: approve + deposit NFT into escrow ─────────────────────────

export type DepositStep = 'approving' | 'depositing';

export function useEscrowDeposit() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  /**
   * Approve the escrow contract for the NFT, then deposit it.
   * @param numericLoanId  uint256 loan ID (BigInt) stored on-chain and in Firestore.
   * @param nftContract    ERC-721 contract address of the collateral.
   * @param tokenId        Token ID of the collateral.
   * @param onStep         Optional callback to track progress between the two txs.
   * @returns              Hash of the depositNFT transaction.
   */
  const approveAndDeposit = async (
    numericLoanId: bigint,
    nftContract: `0x${string}`,
    tokenId: bigint,
    onStep?: (step: DepositStep) => void
  ): Promise<`0x${string}`> => {
    if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed yet.');
    const escrowAddr = ESCROW_ADDRESS as `0x${string}`;

    // 1. Approve escrow to transfer the NFT
    onStep?.('approving');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approveTx = await (writeContractAsync as any)({
      address: nftContract,
      abi: ERC721_MINIMAL_ABI,
      functionName: 'approve',
      args: [escrowAddr, tokenId],
    }) as `0x${string}`;
    await publicClient!.waitForTransactionReceipt({ hash: approveTx });

    // 2. Deposit NFT into escrow
    onStep?.('depositing');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const depositTx = await (writeContractAsync as any)({
      address: escrowAddr,
      abi: ESCROW_ABI,
      functionName: 'depositNFT',
      args: [numericLoanId, nftContract, tokenId],
    }) as `0x${string}`;
    await publicClient!.waitForTransactionReceipt({ hash: depositTx });

    return depositTx;
  };

  return { approveAndDeposit, escrowReady: !!ESCROW_ADDRESS };
}

// ── Admin hook: release or sweep from escrow ──────────────────────────────────

export function useEscrowAdmin() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const callEscrow = async (
    functionName: 'releaseToOwner' | 'sweepToShop',
    loanId: bigint
  ): Promise<`0x${string}`> => {
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
  };

  return {
    releaseToOwner: (loanId: bigint) => callEscrow('releaseToOwner', loanId),
    sweepToShop:    (loanId: bigint) => callEscrow('sweepToShop', loanId),
    escrowReady: !!ESCROW_ADDRESS,
  };
}
