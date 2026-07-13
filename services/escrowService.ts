/**
 * DigiPawnsEscrow — on-chain interface for the frontend.
 *
 * ESCROW_ADDRESS is injected at build time via Vite's `define`.
 * Set the `VITE_ESCROW_ADDRESS` Replit Secret after deploying the contract.
 * When the secret is absent the escrow features degrade gracefully (the
 * app falls back to simulated Firestore-only flows).
 */
export const ESCROW_ADDRESS: `0x${string}` | '' =
  (process.env.VITE_ESCROW_ADDRESS as `0x${string}`) || '';

// ── ABIs ─────────────────────────────────────────────────────────────────────

/** Minimal ERC-721 ABI — only the approve function we need. */
export const ERC721_MINIMAL_ABI = [
  {
    name: 'approve',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

/** DigiPawnsEscrow ABI — only the functions called from the frontend. */
export const ESCROW_ABI = [
  {
    name: 'depositNFT',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'loanId', type: 'uint256' },
      { name: 'nftContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'releaseToOwner',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'sweepToShop',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getLoan',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'borrower', type: 'address' },
          { name: 'nftContract', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
  {
    name: 'approveCollection',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'nftContract', type: 'address' }],
    outputs: [],
  },
  {
    name: 'revokeCollection',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'nftContract', type: 'address' }],
    outputs: [],
  },
] as const;
