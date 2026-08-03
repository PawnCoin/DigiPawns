/**
 * DigiPawnsEscrow v2 — on-chain interface for the frontend.
 *
 * ESCROW_ADDRESS is injected at build time via Vite's `define`.
 * Set the `VITE_ESCROW_ADDRESS` Replit Secret after deploying the proxy contract.
 * When the secret is absent the escrow features degrade gracefully (the
 * app falls back to simulated Firestore-only flows).
 *
 * The contract is a UUPS upgradeable proxy — the address never changes even
 * when the admin pushes a new implementation via upgradeTo().
 */
export const ESCROW_ADDRESS: `0x${string}` | '' =
  (process.env.VITE_ESCROW_ADDRESS as `0x${string}`) || '';

// ── Tier enum (mirrors Solidity: 0 = NONE, 1 = STANDARD, 2 = GOLD) ──────────
export const TIER = { NONE: 0, STANDARD: 1, GOLD: 2 } as const;
export type TierValue = (typeof TIER)[keyof typeof TIER];

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

/** DigiPawnsEscrow v2 ABI — all functions used by the frontend and admin UI. */
export const ESCROW_ABI = [
  // ── Core loan lifecycle ────────────────────────────────────────────────────
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

  // ── Views ──────────────────────────────────────────────────────────────────
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
          { name: 'borrower',    type: 'address' },
          { name: 'nftContract', type: 'address' },
          { name: 'tokenId',     type: 'uint256' },
          { name: 'status',      type: 'uint8'   }, // 0=Active 1=Released 2=Swept
          { name: 'tier',        type: 'uint8'   }, // 0=NONE 1=STANDARD 2=GOLD
        ],
      },
    ],
  },
  {
    name: 'previewReward',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [
      { name: 'token',  type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  {
    name: 'getTierForAddress',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }], // 0=NONE 1=STANDARD 2=GOLD
  },

  // ── Collection allowlist ───────────────────────────────────────────────────
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
  {
    name: 'approvedCollections',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'nftContract', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ── Global pause ──────────────────────────────────────────────────────────
  {
    name: 'pause',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [],
    outputs: [],
  },
  {
    name: 'unpause',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [],
    outputs: [],
  },
  {
    name: 'paused',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ── Wallet blacklist ───────────────────────────────────────────────────────
  {
    name: 'blacklist',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [],
  },
  {
    name: 'unblacklist',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [],
  },
  {
    name: 'blacklisted',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ── Loan freeze ───────────────────────────────────────────────────────────
  {
    name: 'freezeLoan',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'unfreezeLoan',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'frozenLoans',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ── Token tier config ─────────────────────────────────────────────────────
  {
    name: 'setTokenTierConfig',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_digToken',         type: 'address' },
      { name: '_digGoldThreshold', type: 'uint256' },
      { name: '_pcEthToken',       type: 'address' },
      { name: '_pcGoldThreshold',  type: 'uint256' },
    ],
    outputs: [],
  },

  // ── Reward config ─────────────────────────────────────────────────────────
  {
    name: 'setRewardConfig',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_rewardToken',          type: 'address' },
      { name: '_baseRewardAmount',     type: 'uint256' },
      { name: '_goldRewardMultiplier', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdrawRewardPool',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },

  // ── Shop address ──────────────────────────────────────────────────────────
  {
    name: 'updateShopAddress',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'newShopAddress', type: 'address' }],
    outputs: [],
  },
  {
    name: 'shopAddress',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },

  // ── Reward / tier state readers ───────────────────────────────────────────
  {
    name: 'rewardToken',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'baseRewardAmount',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'goldRewardMultiplier',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'digToken',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'pcEthToken',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
