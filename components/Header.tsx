import React, { useState, useEffect, useRef } from 'react';
import { DigiPawnsFullLogo, WalletIcon, LogOutIcon } from './IconComponents';
import { useAppContext } from '../contexts/AppContext';
import useRouter from '../hooks/useRouter';

const Header: React.FC = () => {
  const {
    isConnected, isAdmin, walletAddress, profile, connectWallet, disconnectWallet, navigate,
    isWalletConnected, isConnectingWallet, isCorrectChain, chainName, connectRealWallet, disconnectChainWallet,
  } = useAppContext();
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
    if (isWalletConnected) disconnectChainWallet();
    setIsDropdownOpen(false);
  };

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
    <header className="sticky top-0 z-50 bg-brand-dark/90 backdrop-blur-md border-b border-yellow-900/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-28">
          <a href="/" className="flex-shrink-0"><DigiPawnsFullLogo className="h-24 py-2" /></a>
          <nav className="hidden md:flex items-center space-x-8">
            <button onClick={() => navigate('/shop')} className={`transition-colors duration-200 ${route === '/shop' ? 'text-brand-gold' : 'text-gray-400 hover:text-brand-gold'}`}>Shop Floor</button>
            <a href="#how-it-works" onClick={handleScrollClick} className="text-gray-400 hover:text-brand-gold transition-colors duration-200">How It Works</a>
            <a href="#appraise"     onClick={handleScrollClick} className="text-gray-400 hover:text-brand-gold transition-colors duration-200">Appraise</a>
            <a href="#categories"   onClick={handleScrollClick} className="text-gray-400 hover:text-brand-gold transition-colors duration-200">Categories</a>
            <a href="#collections"  onClick={handleScrollClick} className="text-gray-400 hover:text-brand-gold transition-colors duration-200">Collections</a>
            <a href="#faq"          onClick={handleScrollClick} className="text-gray-400 hover:text-brand-gold transition-colors duration-200">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            {isConnected && (
              isWalletConnected ? (
                <span
                  title={isCorrectChain ? `Connected to ${chainName}` : `Wrong network — please switch to ${chainName}`}
                  className={`hidden sm:flex items-center gap-2 font-mono text-xs py-2 px-3 rounded-lg border ${isCorrectChain ? 'border-green-700/50 bg-green-900/20 text-green-400' : 'border-red-700/50 bg-red-900/20 text-red-400'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${isCorrectChain ? 'bg-green-400' : 'bg-red-400'}`} />
                  {formatAddress(walletAddress || '')}
                </span>
              ) : (
                <button
                  onClick={connectRealWallet}
                  disabled={isConnectingWallet}
                  className="hidden sm:flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-lg border border-yellow-900/50 text-brand-gold hover:border-brand-gold/60 hover:bg-brand-gold/10 transition-colors disabled:opacity-50"
                >
                  <WalletIcon className="w-4 h-4" />
                  {isConnectingWallet ? 'Connecting…' : 'Connect Wallet'}
                </button>
              )
            )}
          <div className="relative" ref={dropdownRef}>
            {isConnected ? (
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-brand-navy border border-yellow-900/50 text-white font-mono text-sm py-2 px-4 rounded-lg hover:border-brand-gold/60 transition-all duration-300 flex items-center space-x-2"
              >
                {profile.avatarNftUrl ? (
                  <img src={profile.avatarNftUrl} alt="Avatar" className="w-6 h-6 rounded-full" />
                ) : (
                  <WalletIcon className="w-5 h-5 text-brand-gold" />
                )}
                <span>{profile.username}</span>
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="btn-metallic-gold py-2 px-6 rounded-lg"
              >
                Sign In
              </button>
            )}
            {isDropdownOpen && isConnected && (
              <div className="absolute right-0 mt-2 w-52 bg-brand-navy border border-yellow-900/40 rounded-lg shadow-lg py-2 z-10">
                <button onClick={handleDashboardClick} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-brand-gold flex items-center space-x-2">
                  <span>My Dashboard</span>
                </button>
                <button onClick={() => { navigate('/shop'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-brand-gold flex items-center space-x-2">
                  <span>Shop Floor</span>
                </button>
                {isAdmin && (
                  <button onClick={() => { navigate('/admin'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-brand-gold hover:bg-brand-gold/10 flex items-center space-x-2">
                    <span>⚙️ Admin Panel</span>
                  </button>
                )}
                <button onClick={handleDisconnect} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300 flex items-center space-x-2">
                  <LogOutIcon className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
