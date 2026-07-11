import React from 'react';

const Step: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
  <div className="relative pl-12 pb-8 border-l-2 border-brand-gold/30">
    <div className="absolute -left-5 top-0 w-10 h-10 bg-brand-gold-dark rounded-full flex items-center justify-center font-bold text-brand-dark shadow-gold-glow">
      {number}
    </div>
    <h3 className="text-xl font-bold text-brand-gold">{title}</h3>
    <p className="mt-2 text-gray-400">{children}</p>
  </div>
);

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Get a Loan in <span className="text-brand-gold">4 Simple Steps</span>
        </h2>
        <div className="space-y-4">
          <Step number="1" title="Submit Your NFT">
            Connect your wallet and select the digital asset you wish to use as collateral. Provide a few basic details for appraisal.
          </Step>
          <Step number="2" title="AI-Powered Appraisal">
            Our advanced AI, powered by Gemini, provides an instant and fair market valuation for your NFT based on real-time data.
          </Step>
          <Step number="3" title="Receive Your Loan">
            Accept the loan offer and receive cryptocurrency directly to your wallet. Your NFT is secured in our audited smart contract vault.
          </Step>
          <Step number="4" title="Repay & Reclaim">
            Repay your loan within the agreed term to instantly reclaim your NFT. It's that simple.
          </Step>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
