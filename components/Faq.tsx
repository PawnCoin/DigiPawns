import React, { useState } from 'react';
import { FAQ_ITEMS } from '../constants';
import type { FaqItem } from '../types';
import { ChevronDownIcon } from './IconComponents';


const FaqAccordionItem: React.FC<{ item: FaqItem }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="border-b border-gray-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-5 px-2"
            >
                <span className="text-lg font-medium text-gray-100">{item.question}</span>
                {/* Fix: Corrected Tailwind CSS class from 'rotate-188' to 'rotate-180' for proper animation. */}
                <ChevronDownIcon className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                 <div className="pb-5 px-2 text-gray-400">
                    {item.answer}
                 </div>
            </div>
        </div>
    );
};

const Faq: React.FC = () => {
  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Frequently Asked <span className="text-blue-400">Questions</span>
        </h2>
        <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
                <FaqAccordionItem key={index} item={item} />
            ))}
        </div>
      </div>
    </section>
  );
};

export default Faq;