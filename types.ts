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
}

export interface UserProfile {
    uid?: string;
    username: string;
    avatarNftUrl: string | null;
    walletAddress?: string | null;
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

  // Auth
  navigate: (path: string) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  connectRealWallet: () => Promise<void>;
  disconnectChainWallet: () => void;

  // Loan actions
  addLoan: (loan: Loan) => void;
  repayLoan: (loanId: string) => void;
  liquidateLoan: (loanId: string) => void;

  // Shop actions
  buyShopItem: (itemId: string) => Promise<void>;
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
}
