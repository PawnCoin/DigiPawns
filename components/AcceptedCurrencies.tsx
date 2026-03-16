import React from 'react';
import { ACCEPTED_CURRENCIES } from '../constants';
import type { CryptoCurrency } from '../types';

const CurrencyItem: React.FC<{ currency: CryptoCurrency }> = ({ currency }) => (
    <div className="flex items-center space-x-4 bg-gray-900/50 border border-gray-700/80 px-6 py-3 rounded-xl mx-4 flex-shrink-0 transition-all duration-300 hover:scale-110 hover:border-blue-500 hover:bg-gray-800/70 shadow-lg">
        {currency.icon}
        <div className="text-left">
            <p className="font-semibold text-white">{currency.name}</p>
            <p className="text-sm text-gray-400">{currency.ticker}</p>
        </div>
    </div>
);

const AcceptedCurrencies: React.FC = () => {
  // Duplicate the array for a seamless, looping marquee effect
  const marqueeCurrencies = [...ACCEPTED_CURRENCIES, ...ACCEPTED_CURRENCIES];
  
  return (
    <section id="currencies" className="py-20 sm:py-24 overflow-hidden">
      <div className="container mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Flexible Loan Payouts in <span className="text-blue-400">15+ Major Currencies</span>
        </h2>
        <div className="relative flex overflow-x-hidden group" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)', maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)' }}>
            <div className="flex w-max animate-marquee-fast group-hover:[animation-play-state:paused] py-4">
                {marqueeCurrencies.map((currency, index) => (
                    <CurrencyItem key={`${currency.ticker}-${index}`} currency={currency} />
                ))}
            </div>
        </div>
      </div>
    </section>
  );
};

export default AcceptedCurrencies;