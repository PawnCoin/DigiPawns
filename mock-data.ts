import type { Loan, Nft } from './types';

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