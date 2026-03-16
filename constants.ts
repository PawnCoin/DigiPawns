

import React from 'react';
// FIX: Add missing icon imports for NFT categories.
import { OpenSeaIcon, MagicEdenIcon, RaribleIcon, BtcIcon, EthIcon, UsdtIcon, UsdcIcon, BnbIcon, SolIcon, XrpIcon, AdaIcon, DogeIcon, AvaxIcon, DotIcon, MaticIcon, ShibIcon, TrxIcon, LinkIcon, PepeIcon, ArtIcon, GamingIcon, CollectiblesIcon, VirtualWorldsIcon, MusicIcon } from './components/IconComponents';
// FIX: Add NftCategory to type imports.
import type { NftMarketplace, FaqItem, CryptoCurrency, NftCategory } from './types';

export const NFT_MARKETPLACES: NftMarketplace[] = [
  { name: 'OpenSea', logo: React.createElement(OpenSeaIcon) },
  { name: 'Magic Eden', logo: React.createElement(MagicEdenIcon) },
  { name: 'Rarible', logo: React.createElement(RaribleIcon) },
];

// FIX: Define and export the missing NFT_CATEGORIES constant.
export const NFT_CATEGORIES: NftCategory[] = [
  { name: 'Art', icon: React.createElement(ArtIcon) },
  { name: 'Gaming', icon: React.createElement(GamingIcon) },
  { name: 'Collectibles', icon: React.createElement(CollectiblesIcon) },
  { name: 'Virtual Worlds', icon: React.createElement(VirtualWorldsIcon) },
  { name: 'Music', icon: React.createElement(MusicIcon) },
];


export const FAQ_ITEMS: FaqItem[] = [
    {
        question: "What is DigiPawns?",
        answer: "DigiPawns is a digital pawn shop that allows you to get instant crypto loans using your Non-Fungible Tokens (NFTs) as collateral. We use advanced AI to appraise your assets and provide you with quick liquidity."
    },
    {
        question: "How does the NFT appraisal process work?",
        answer: "Our system uses a powerful AI model (Gemini) to analyze your NFT based on its collection, artist, rarity traits, sales history, and current market trends. This provides a fair, data-driven market valuation in real-time."
    },
    {
        question: "What happens if I can't repay my loan?",
        answer: "If a loan is not repaid by its due date, the NFT collateral is forfeited and may be sold by DigiPawns to recover the loan amount. We send multiple reminders before the due date to help you avoid this."
    },
    {
        question: "Is my digital asset secure?",
        answer: "Absolutely. When you take out a loan, your NFT is transferred to a highly secure, audited smart contract vault. It remains there, untouched, until your loan is fully repaid, at which point it is automatically returned to your wallet."
    }
];

export const ACCEPTED_CURRENCIES: CryptoCurrency[] = [
  { name: 'Bitcoin', ticker: 'BTC', icon: React.createElement(BtcIcon) },
  { name: 'Ethereum', ticker: 'ETH', icon: React.createElement(EthIcon) },
  { name: 'Tether', ticker: 'USDT', icon: React.createElement(UsdtIcon) },
  { name: 'USD Coin', ticker: 'USDC', icon: React.createElement(UsdcIcon) },
  { name: 'BNB', ticker: 'BNB', icon: React.createElement(BnbIcon) },
  { name: 'Solana', ticker: 'SOL', icon: React.createElement(SolIcon) },
  { name: 'XRP', ticker: 'XRP', icon: React.createElement(XrpIcon) },
  { name: 'Cardano', ticker: 'ADA', icon: React.createElement(AdaIcon) },
  { name: 'Pepe', ticker: 'PEPE', icon: React.createElement(PepeIcon) },
  { name: 'Dogecoin', ticker: 'DOGE', icon: React.createElement(DogeIcon) },
  { name: 'Avalanche', ticker: 'AVAX', icon: React.createElement(AvaxIcon) },
  { name: 'Polkadot', ticker: 'DOT', icon: React.createElement(DotIcon) },
  { name: 'Polygon', ticker: 'MATIC', icon: React.createElement(MaticIcon) },
  { name: 'Shiba Inu', ticker: 'SHIB', icon: React.createElement(ShibIcon) },
  { name: 'TRON', ticker: 'TRX', icon: React.createElement(TrxIcon) },
  { name: 'Chainlink', ticker: 'LINK', icon: React.createElement(LinkIcon) },
];