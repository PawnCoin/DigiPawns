import React, { useState, useEffect, useRef } from 'react';
import { DigiPawnsFullLogo, WalletIcon, LogOutIcon } from './IconComponents';
import { useAppContext } from '../contexts/AppContext';
import useRouter from '../hooks/useRouter';

const Header: React.FC = () => {
  const { isConnected, walletAddress, profile, connectWallet, disconnectWallet, navigate } = useAppContext();
  const { route } = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleScrollClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    
    const scrollTo = () => {
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

    if (route !== '/') {
        navigate('/');
        setTimeout(scrollTo, 100);
    } else {
        scrollTo();
    }
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
    setIsDropdownOpen(false);
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
    setIsDropdownOpen(false);
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <header className="sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 border-b border-gray-800">
          <a href="/"><DigiPawnsFullLogo /></a>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#how-it-works" onClick={handleScrollClick} className="text-gray-300 hover:text-white transition-colors duration-200">How It Works</a>
            <a href="#appraise" onClick={handleScrollClick} className="text-gray-300 hover:text-white transition-colors duration-200">Appraise</a>
            <a href="#categories" onClick={handleScrollClick} className="text-gray-300 hover:text-white transition-colors duration-200">Categories</a>
            <a href="#collections" onClick={handleScrollClick} className="text-gray-300 hover:text-white transition-colors duration-200">Collections</a>
            <a href="#faq" onClick={handleScrollClick} className="text-gray-300 hover:text-white transition-colors duration-200">FAQ</a>
          </nav>
          <div className="relative" ref={dropdownRef}>
            {isConnected ? (
              <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-brand-gray border border-gray-700 text-white font-mono text-sm py-2 px-4 rounded-lg hover:bg-gray-800 transition-all duration-300 flex items-center space-x-2"
                >
                {profile.avatarNftUrl ? (
                  <img src={profile.avatarNftUrl} alt="Avatar" className="w-6 h-6 rounded-full" />
                ) : (
                  <WalletIcon className="w-5 h-5 text-blue-400" />
                )}
                <span>{walletAddress ? formatAddress(walletAddress) : profile.username}</span>
              </button>
            ) : (
              <button 
                onClick={connectWallet}
                className="bg-brand-blue-light text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-500 transition-all duration-300 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/40 transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
            )}
            {isDropdownOpen && isConnected && (
              <div className="absolute right-0 mt-2 w-48 bg-brand-gray border border-gray-700 rounded-lg shadow-lg py-2 z-10">
                <button
                  onClick={handleDashboardClick}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center space-x-2"
                >
                  <span>My Dashboard</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300 flex items-center space-x-2"
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;