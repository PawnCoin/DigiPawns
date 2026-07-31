import React from 'react';

// Core Data Structures
export interface Nft {
  id: number | string;
  name: string;
  collection: string;
  imageUrl: string;
  estimatedValue: number;
  contractAddress: string;
  tokenId: string;
}

export type LoanStatus = 'Active' | 'Repaid' | 'Defaulted' | 'Liquidated';
export type NftTransferStatus = 'awaiting_transfer' | 'received' | 'active' | 'returned' | 'liquidated';

export interface Loan {
  id: string;
  uid?: string;
  nftName?: string;
  nftCollection?: string;
  nftImageUrl?: string;
  contractAddress?: string;
  tokenId?: string;
  nftChain?: string;
  /** String representation of the uint256 loanId used on-chain with DigiPawnsEscrow. */
  numericLoanId?: string;
  nft: {
    name: string;
    collection: string;
    imageUrl: string;
  };
  principal: number;
  interestRate: number;
  dueDate: string;
  repaymentAmount: number;
  status: LoanStatus;
  nftTransferStatus?: NftTransferStatus;
  createdAt?: string;
  /** On-chain tx hash when the loan was repaid with a token (DIG/PC). */
  repaymentTxHash?: string;
  /** Token ticker used to repay ('credit' | 'DIG' | 'PC-ETH' | 'PC-SOL'). */
  repaymentToken?: string;
  /** Discount percentage applied at repayment (e.g. 0.25 for DIG). */
  repaymentDiscountPct?: number;
}

export interface UserProfile {
    uid?: string;
    username: string;
    avatarNftUrl: string | null;
    walletAddress?: string | null;
    solanaAddress?: string | null;
    bio?: string;
    isAdmin?: boolean;
    createdAt?: string;
    balance?: number;
}

export type ShopItemSource = 'liquidated' | 'admin' | 'user-sold' | 'trade-in';

export interface ShopItem {
    id: string;
    name: string;
    collection: string;
    imageUrl: string;
    category?: string;
    chain?: string;
    price: number;
    source: ShopItemSource;
    sellerUid?: string;
    sellerUsername?: string;
    originalLoanId?: string;
    listedAt: string;
    /** On-chain contract address — stored when the item was imported from a wallet or
     *  swept from escrow, so future escrow flows can reference it without re-fetching. */
    contractAddress?: string;
    /** On-chain token ID — stored alongside contractAddress for the same reason. */
    tokenId?: string;
    /** Admin must explicitly approve before the item is visible in the public shop.
     *  Defaults to true for admin-added items, false for user-sold/liquidated/traded-in. */
    approved?: boolean;
}

export interface NotificationSettings {
    uid?: string;
    loanDueSoon: boolean;
    repaymentSuccess: boolean;
    loanDefaulted: boolean;
}

export type ActivityType = 'loan-created' | 'loan-repaid' | 'profile-updated' | 'loan-liquidated' | 'item-bought' | 'item-sold' | 'item-traded';

export interface Activity {
    id: string;
    uid?: string;
    type: ActivityType;
    description: string;
    timestamp: string;
}

export interface Friend {
    uid: string;
    username: string;
    avatarNftUrl: string | null;
    addedAt: string;
}

export interface Message {
    id: string;
    conversationId: string;
    fromUid: string;
    fromUsername: string;
    toUid: string;
    text: string;
    timestamp: string;
    read: boolean;
}

export interface Collection {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    chain: string;
    floorPrice: number;
    currency: string;
    totalItems: number;
    verified: boolean;
    website?: string;
    createdAt?: string;
}

export interface WatchedWallet {
    id: string;
    address: string;
    label: string;
    savedAt: string;
}

// Component-specific Props
export interface NftMarketplace {
  name: string;
  logo: React.ReactElement;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CryptoCurrency {
    name: string;
    ticker: string;
    icon: React.ReactElement;
}

export interface NftCategory {
    name: string;
    icon: React.ReactElement;
}

// API & Service Payloads
export interface NftAppraisal {
  estimatedValueUSD: number;
  confidenceScore: number;
  valueDrivers: string[];
  suggestedLoanUSD: number;
  justification: string;
}

export interface FeaturedNftItem {
    name: string;
    collection: string;
    estimatedValue: number;
}
  
export interface FeaturedNftCategory {
    categoryName: string;
    description: string;
    nfts: FeaturedNftItem[];
}

export interface LoanTerms {
    interestRate: number;
    termLength: number;
    repaymentAmount: number;
}

// Global State (Context)
export interface AppContextType {
  // State
  isConnected: boolean;
  isAdmin: boolean;
  userId: string | null;
  walletAddress: string | null;
  isWalletConnected: boolean;
  isConnectingWallet: boolean;
  isCorrectChain: boolean;
  chainName: string;
  loans: Loan[];
  profile: UserProfile;
  notificationSettings: NotificationSettings;
  activityLog: Activity[];
  friends: Friend[];
  messages: Message[];
  collections: Collection[];
  allUsers: UserProfile[];
  allLoans: Loan[];
  shopInventory: ShopItem[];
  ownedItems: ShopItem[];

  // Solana wallet
  isSolanaConnected: boolean;
  solanaAddress: string | null;
  connectSolanaWallet: (walletName: string) => void;
  disconnectSolanaWallet: () => void;

  // Auth
  navigate: (path: string) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  connectRealWallet: (connectorId?: string) => Promise<{ success: boolean; errorType?: 'allowlist' | 'cancelled' | 'generic' }>;
  /** Opens the crypto wallet picker modal from anywhere in the app */
  openWalletPicker: () => void;
  /** Switches the connected EVM wallet to a supported chain */
  switchToCorrectChain: () => Promise<void>;
  walletOptions: { id: string; label: string; description: string }[];
  disconnectChainWallet: () => void;

  // Loan actions
  addLoan: (loan: Loan) => void;
  repayLoan: (loanId: string, paymentInfo?: { txHash?: string; token?: string; discountPct?: number }) => void;
  liquidateLoan: (loanId: string) => void;

  // Shop actions
  buyShopItem: (itemId: string, paymentInfo?: { txHash?: string; token?: string; discountPct?: number }) => Promise<void>;
  sellNftToShop: (item: { name: string; collection: string; imageUrl: string; category?: string }, price: number) => Promise<void>;
  tradeInForItem: (shopItemId: string, offeredNft: { name: string; collection: string; imageUrl: string; category?: string }) => Promise<void>;
  adminAddShopItem: (item: Omit<ShopItem, 'id' | 'listedAt' | 'source'>) => Promise<void>;
  adminUpdateShopItem: (id: string, data: Partial<ShopItem>) => Promise<void>;
  adminDeleteShopItem: (id: string) => Promise<void>;

  // Profile
  updateProfile: (profile: UserProfile) => void;
  updateNotificationSettings: (settings: NotificationSettings) => void;

  // Social
  searchUsers: (query: string) => Promise<UserProfile[]>;
  addFriend: (user: UserProfile) => Promise<void>;
  removeFriend: (uid: string) => Promise<void>;
  sendMessage: (toUid: string, toUsername: string, text: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;

  // Admin
  adminUpdateUser: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  adminDeleteUser: (uid: string) => Promise<void>;
  adminUpdateLoan: (loanId: string, data: Partial<Loan>) => Promise<void>;
  adminDeleteLoan: (loanId: string) => Promise<void>;
  adminAddCollection: (collection: Omit<Collection, 'id' | 'createdAt'>) => Promise<void>;
  adminUpdateCollection: (id: string, data: Partial<Collection>) => Promise<void>;
  adminDeleteCollection: (id: string) => Promise<void>;

  // Watched wallets
  watchedWallets: WatchedWallet[];
  saveWatchedWallet: (address: string, label: string) => Promise<void>;
  removeWatchedWallet: (id: string) => Promise<void>;
}
