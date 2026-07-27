import React from 'react';
import useRouter from '../hooks/useRouter';

interface HeroSectionProps {
    onCalculatorOpen: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onCalculatorOpen }) => {
  const { navigate } = useRouter();

  const handleScrollClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    if (href) {
      const targetElement = document.querySelector(href);
      if (targetElement) {
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="text-center py-20 sm:py-24 lg:py-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tighter leading-tight">
          Unlock the Value of Your{' '}
          <span className="text-metallic-gold">Digital Assets</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
          Instant crypto loans against your NFTs. Get a fast, secure, and confidential AI-powered appraisal in seconds.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#appraise"
            onClick={handleScrollClick}
            className="btn-metallic-gold py-4 px-10 rounded-lg text-lg"
          >
            Get a Free Appraisal
          </a>
          <button
            onClick={onCalculatorOpen}
            className="bg-transparent border-2 border-yellow-900/50 text-gray-300 font-bold py-4 px-10 rounded-lg text-lg hover:bg-brand-navy hover:border-brand-gold/50 transition-all duration-300 transform hover:scale-105"
          >
            Loan Calculator
          </button>
          <button
            onClick={() => navigate('/video')}
            className="bg-brand-navy border border-blue-500/30 text-blue-400 font-bold py-4 px-8 rounded-lg text-lg hover:bg-blue-900/30 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Watch Promo
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
