import React from 'react';
import { motion } from 'framer-motion';

const TOKENS = [
  {
    name: 'DigiPawns Token',
    ticker: '$DIG',
    logo: '/dig-logo.png',
    chains: ['Polygon', 'Ethereum'],
    chainColors: ['#8247e5', '#627eea'],
    description: 'The native governance and utility token of DigiPawns. Hold $DIG to access exclusive loan rates, priority appraisals, and platform rewards.',
    discount: '25%',
    tag: 'Native Token',
    buyUrl: '#',
  },
  {
    name: 'Pawn Coin',
    ticker: '$PC',
    logo: '/pc-logo.png',
    chains: ['Ethereum', 'Solana'],
    chainColors: ['#627eea', '#9945ff'],
    description: 'The community-driven payment coin of the DigiPawns ecosystem. Use $PC to settle loans, earn cashback, and unlock VIP pawn tiers.',
    discount: '20%',
    tag: 'Payment Coin',
    buyUrl: '#',
  },
];

const CheckIcon = () => (
  <svg className="w-5 h-5 text-brand-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PERKS = [
  'Lower interest rates on every loan',
  'Priority AI appraisal queue',
  'Reduced platform fees',
  'Exclusive VIP pawn tiers',
];

const TokenSection: React.FC = () => {
  return (
    <section className="py-20 sm:py-24">
      {/* Header */}
      <div className="text-center mb-4">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border border-brand-gold/40 text-brand-gold bg-brand-gold/10 mb-4">
          Exclusive Offer
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Pay with Our Tokens —{' '}
          <span className="text-metallic-gold">Save Big, Every Time</span>
        </h2>
        <p className="mt-4 text-gray-400 max-w-2xl mx-auto text-lg">
          Using <strong className="text-white">$DIG</strong> or <strong className="text-white">$PC</strong> to repay your loans unlocks discounts you simply can't find anywhere else. An offer too good to pass up.
        </p>
      </div>

      {/* Can't-beat-it banner */}
      <div className="mt-8 mb-12 mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-950/60 via-brand-navy to-yellow-950/60 p-5 text-center"
          style={{ boxShadow: '0 0 40px rgba(212,160,23,0.15)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #D4A017 0, #D4A017 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
          <p className="relative text-xl sm:text-2xl font-black text-brand-gold tracking-tight">
            🔥 Up to <span className="text-white">25% OFF</span> loan fees — exclusively for $DIG & $PC holders
          </p>
          <p className="relative mt-1 text-sm text-gray-400">
            This discount is automatically applied at checkout. No codes, no hassle.
          </p>
        </div>
      </div>

      {/* Token cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {TOKENS.map((token, i) => (
          <motion.div
            key={token.ticker}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="relative group rounded-2xl border border-yellow-900/40 bg-brand-navy/80 p-6 flex flex-col gap-5 overflow-hidden hover:border-brand-gold/50 transition-all duration-300"
            style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.3)' }}
          >
            {/* Subtle corner glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-gold/5 blur-2xl group-hover:bg-brand-gold/10 transition-all duration-500" />

            {/* Top row: logo + tag + discount badge */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={token.logo}
                  alt={token.ticker}
                  className="w-16 h-16 rounded-full object-cover border-2 border-brand-gold/40 shadow-lg"
                />
                <div>
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-500">{token.tag}</span>
                  <h3 className="text-xl font-extrabold text-white leading-tight">{token.name}</h3>
                  <p className="text-brand-gold font-black text-lg">{token.ticker}</p>
                </div>
              </div>
              {/* Discount badge */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-3 py-2 btn-metallic-gold min-w-[64px]">
                <span className="text-2xl font-black leading-none">{token.discount}</span>
                <span className="text-[10px] font-bold uppercase leading-none mt-0.5">OFF</span>
              </div>
            </div>

            {/* Chain badges */}
            <div className="flex gap-2 flex-wrap">
              {token.chains.map((chain, ci) => (
                <span
                  key={chain}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                  style={{ borderColor: token.chainColors[ci] + '60', color: token.chainColors[ci], background: token.chainColors[ci] + '15' }}
                >
                  {chain}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-gray-400 text-sm leading-relaxed">{token.description}</p>

            {/* Divider */}
            <div className="border-t border-yellow-900/30" />

            {/* Perks */}
            <ul className="space-y-2">
              {PERKS.map(p => (
                <li key={p} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckIcon />
                  {p}
                </li>
              ))}
            </ul>

            {/* Buy button */}
            <a
              href={token.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-metallic-gold w-full text-center py-3 px-6 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 mt-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Buy {token.ticker}
            </a>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          Discount applied automatically when $DIG or $PC is selected as your repayment currency.
        </p>
      </div>
    </section>
  );
};

export default TokenSection;
