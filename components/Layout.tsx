import React from 'react';
import Header from './Header';
import Footer from './Footer';
import HeroBackground from './HeroBackground';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-brand-dark font-sans antialiased flex flex-col relative">
      <HeroBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
