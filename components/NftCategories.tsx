import React from 'react';
import { NFT_CATEGORIES } from '../constants';

const NftCategories: React.FC = () => {
  return (
    <section id="categories" className="py-20 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          We Accept a Wide Range of <span className="text-blue-400">Digital Assets</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {NFT_CATEGORIES.map((category) => (
            <div key={category.name} className="bg-brand-gray p-6 rounded-lg text-center flex flex-col items-center justify-center border border-transparent hover:border-blue-500 hover:bg-gray-800/50 transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-blue-400 mb-3">{category.icon}</div>
              <h3 className="font-semibold text-lg">{category.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NftCategories;