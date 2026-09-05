import React from 'react';
import { DigiPawnsFullLogo } from './IconComponents';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/40 border-t border-yellow-900/20 mt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <DigiPawnsFullLogo />
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} DigiPawns. All rights reserved.</p>
          <div className="flex space-x-4">
            <a href="/support" className="text-gray-500 hover:text-brand-gold transition-colors">Support</a>
            <a href="/privacy" className="text-gray-500 hover:text-brand-gold transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
