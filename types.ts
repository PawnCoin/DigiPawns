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

export interface Loan {
  id: string;
  uid?: string;
  nftName?: string;
  nftCollection?: string;
  nftImageUrl?: string;
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
  createdAt?: string;
}

export interface LinkedWallet {
    address: string;
    lastActive: string;
}

export interface UserProfile {
    uid?: string;
    username: string;
    avatarNftUrl: string | null;
    walletAddress?: string | null;
    createdAt?: string;
}

export interface NotificationSettings {
    uid?: string;
    loanDueSoon: boolean;
    repaymentSuccess: boolean;
    loanDefaulted: boolean;
}

export type ActivityType = 'loan-created' | 'loan-repaid' | 'profile-updated' | 'loan-liquidated';

export interface Activity {
    id: string;
    uid?: string;
    type: ActivityType;
    description: string;
    timestamp: string;
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
  walletAddress: string | null;
  loans: Loan[];
  profile: UserProfile;
  notificationSettings: NotificationSettings;
  activityLog: Activity[];

  // Functions
  navigate: (path: string) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  addLoan: (loan: Loan) => void;
  repayLoan: (loanId: string) => void;
  liquidateLoan: (loanId: string) => void;
  updateProfile: (profile: UserProfile) => void;
  updateNotificationSettings: (settings: NotificationSettings) => void;
}
