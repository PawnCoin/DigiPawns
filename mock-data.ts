import type { Loan, Nft, LinkedWallet, ShopItem } from './types';

// Fallback shop-floor inventory shown when Firestore's `shopInventory` collection is empty.
// Mirrors the PLACEHOLDER_COLLECTIONS pattern used for featured collections.
export const PLACEHOLDER_SHOP_ITEMS: ShopItem[] = [
    { id: 'seed-1', name: 'CryptoPunk #4521', collection: 'CryptoPunks', imageUrl: 'https://picsum.photos/seed/punk4521/400', category: 'Collectibles', chain: 'Ethereum', price: 185000, source: 'liquidated', listedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'seed-2', name: 'Bored Ape #2091', collection: 'Bored Ape Yacht Club', imageUrl: 'https://picsum.photos/seed/ape2091/400', category: 'Collectibles', chain: 'Ethereum', price: 96000, source: 'liquidated', listedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'seed-3', name: 'Chromie Squiggle #812', collection: 'Art Blocks', imageUrl: 'https://picsum.photos/seed/squiggle812/400', category: 'Art', chain: 'Ethereum', price: 14200, source: 'admin', listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'seed-4', name: 'Pudgy Penguin #77', collection: 'Pudgy Penguins', imageUrl: 'https://picsum.photos/seed/pudgy77/400', category: 'Collectibles', chain: 'Ethereum', price: 8300, source: 'admin', listedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'seed-5', name: 'Azuki #3345', collection: 'Azuki', imageUrl: 'https://picsum.photos/seed/azuki3345/400', category: 'Art', chain: 'Ethereum', price: 21500, source: 'liquidated', listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'seed-6', name: 'Sandbox Land Parcel #91', collection: 'The Sandbox', imageUrl: 'https://picsum.photos/seed/sandbox91/400', category: 'Virtual Worlds', chain: 'Ethereum', price: 4200, source: 'admin', listedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'seed-7', name: 'Doodle #1120', collection: 'Doodles', imageUrl: 'https://picsum.photos/seed/doodle1120/400', category: 'Art', chain: 'Ethereum', price: 6700, source: 'liquidated', listedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'seed-8', name: 'Sound Session #204', collection: 'Sound.xyz', imageUrl: 'https://picsum.photos/seed/sound204/400', category: 'Music', chain: 'Ethereum', price: 1900, source: 'admin', listedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
];

export const MOCK_LOANS: Loan[] = [
  {
    id: 'LN001',
    nft: {
      name: 'CryptoPunk #7804',
      collection: 'CryptoPunks',
      imageUrl: '/placeholder-punk.png',
    },
    principal: 7500000,
    interestRate: 5.0,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
    repaymentAmount: 7515625,
    status: 'Active',
  },
  {
    id: 'LN002',
    nft: {
      name: 'Bored Ape #8817',
      collection: 'Bored Ape Yacht Club',
      imageUrl: '/placeholder-ape.png',
    },
    principal: 120000,
    interestRate: 5.5,
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days from now
    repaymentAmount: 120458,
    status: 'Active',
  },
  {
    id: 'LN003',
    nft: {
      name: 'Art Blocks #231',
      collection: 'Chromie Squiggle',
      imageUrl: '/placeholder-squiggle.png',
    },
    principal: 25000,
    interestRate: 6.0,
    dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    repaymentAmount: 25125,
    status: 'Repaid',
  },
   {
    id: 'LN004',
    nft: {
      name: 'Pudgy Penguin #543',
      collection: 'Pudgy Penguins',
      imageUrl: '/placeholder-penguin.png',
    },
    principal: 8000,
    interestRate: 7.0,
    dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    repaymentAmount: 8046,
    status: 'Defaulted',
  },
];

export const MOCK_LINKED_WALLETS: LinkedWallet[] = [
    { 
        address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', 
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    { 
        address: '0x73BCEb1Cd57C711feaC4224D062b0F6ff338501e',
        lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    }
];

// FIX: Defined and exported MOCK_PORTFOLIO_NFTS to provide mock data for the dashboard.
export const MOCK_PORTFOLIO_NFTS: { [key: string]: Nft[] } = {
    '0x1A2b7c...d8E9f0': [
        {
            id: 1,
            name: 'CryptoPunk #3100',
            collection: 'CryptoPunks',
            imageUrl: 'https://picsum.photos/seed/punk3100/200',
            estimatedValue: 7580000,
            contractAddress: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB',
            tokenId: '3100'
        },
        {
            id: 2,
            name: 'Bored Ape #8817',
            collection: 'Bored Ape Yacht Club',
            imageUrl: 'https://picsum.photos/seed/ape8817/200',
            estimatedValue: 120000,
            contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
            tokenId: '8817'
        },
    ],
    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B': [
         {
            id: 4,
            name: 'Pudgy Penguin #100',
            collection: 'Pudgy Penguins',
            imageUrl: 'https://picsum.photos/seed/pudgy100/200',
            estimatedValue: 9000,
            contractAddress: '0xBd3531dA5CF5857e7CfAA92426877b022e612cf8',
            tokenId: '100'
        },
    ],
    '0x73BCEb1Cd57C711feaC4224D062b0F6ff338501e': []
};