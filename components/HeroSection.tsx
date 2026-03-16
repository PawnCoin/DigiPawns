import React from 'react';

interface HeroSectionProps {
    onCalculatorOpen: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onCalculatorOpen }) => {
  const handleScrollClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    if (href) {
      const targetElement = document.querySelector(href);
      if (targetElement) {
        const headerOffset = 80; // height of the header
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <section className="text-center py-20 sm:py-24 lg:py-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tighter leading-tight">
          Unlock the Value of Your 
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600"> Digital Assets</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
          Instant crypto loans against your NFTs. Get a fast, secure, and confidential AI-powered appraisal in seconds.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="#appraise" 
            onClick={handleScrollClick}
            className="bg-brand-blue-light text-white font-bold py-4 px-10 rounded-lg text-lg hover:bg-blue-500 transition-all duration-300 shadow-blue-glow transform hover:scale-105"
          >
            Get a Free Appraisal
          </a>
           <button 
            onClick={onCalculatorOpen}
            className="bg-transparent border-2 border-gray-600 text-gray-300 font-bold py-4 px-10 rounded-lg text-lg hover:bg-gray-800 hover:border-gray-500 transition-all duration-300 transform hover:scale-105"
          >
            Loan Calculator
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;