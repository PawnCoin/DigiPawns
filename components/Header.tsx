import React, { useState, useEffect, useRef } from 'react';
import { DigiPawnsFullLogo, WalletIcon, LogOutIcon } from './IconComponents';
import { useAppContext } from '../contexts/AppContext';
import useRouter from '../hooks/useRouter';

const Header: React.FC = () => {
  const {
    isConnected, isAdmin, walletAddress, profile, connectWallet, disconnectWallet, navigate,
    isWalletConnected, isConnectingWallet, isCorrectChain, chainName, disconnectChainWallet,
    openWalletPicker, switchToCorrectChain,
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
          const offsetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }
    };
    if (route !== '/') { navigate('/'); setTimeout(scrollTo, 100); }
    else { scrollTo(); }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    if (isWalletConnected) disconnectChainWallet();
    setIsDropdownOpen(false);
  };

  const go = (path: string) => { navigate(path); setIsDropdownOpen(false); };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAddress = (address: string) =>
    address?.length >= 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

  return (
    <header className="sticky top-0 z-50 bg-brand-dark/90 backdrop-blur-md border-b border-yellow-900/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <a href="/" className="flex-shrink-0"><DigiPawnsFullLogo className="h-16 py-1" /></a>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-7">
            <button onClick={() => navigate('/shop')} className={`text-sm transition-colors ${route === '/shop' ? 'text-brand-gold' : 'text-gray-400 hover:text-brand-gold'}`}>Shop Floor</button>
            <a href="#how-it-works" onClick={handleScrollClick} className="text-sm text-gray-400 hover:text-brand-gold transition-colors">How It Works</a>
            <a href="#appraise"     onClick={handleScrollClick} className="text-sm text-gray-400 hover:text-brand-gold transition-colors">Appraise</a>
            <a href="#categories"   onClick={handleScrollClick} className="text-sm text-gray-400 hover:text-brand-gold transition-colors">Categories</a>
            <a href="#collections"  onClick={handleScrollClick} className="text-sm text-gray-400 hover:text-brand-gold transition-colors">Collections</a>
            <a href="#faq"          onClick={handleScrollClick} className="text-sm text-gray-400 hover:text-brand-gold transition-colors">FAQ</a>
          </nav>

          {/* Right-side controls */}
          <div className="flex items-center gap-2">

            {/* ── Wallet pill — always visible ── */}
            {isWalletConnected ? (
              isCorrectChain ? (
                /* Correct chain: green address badge */
                <span
                  title={`Connected to ${chainName}`}
                  className="hidden sm:flex items-center gap-1.5 font-mono text-xs py-1.5 px-3 rounded-lg border border-green-700/50 bg-green-900/20 text-green-400 cursor-default"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  {formatAddress(walletAddress || '')}
                </span>
              ) : (
                /* Wrong chain: actionable "Switch Network" button */
                <button
                  onClick={switchToCorrectChain}
                  title={`Switch to ${chainName}`}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border border-red-700/50 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Wrong Network
                </button>
              )
            ) : (
              /* No crypto wallet: show Connect Wallet for all users */
              <button
                onClick={openWalletPicker}
                disabled={isConnectingWallet}
                className="hidden sm:flex items-center gap-2 text-xs font-semibold py-1.5 px-3 rounded-lg border border-yellow-900/50 text-brand-gold hover:border-brand-gold/60 hover:bg-brand-gold/10 transition-colors disabled:opacity-50"
              >
                <WalletIcon className="w-4 h-4" />
                {isConnectingWallet ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}

            {/* ── Account button / Sign In ── */}
            <div className="relative" ref={dropdownRef}>
              {isConnected ? (
                <>
                  {/* Avatar / username toggle */}
                  <button
                    onClick={() => setIsDropdownOpen(v => !v)}
                    className="flex items-center gap-2 bg-brand-navy border border-yellow-900/50 text-white text-sm py-1.5 px-3 rounded-lg hover:border-brand-gold/60 transition-all"
                  >
                    {profile.avatarNftUrl
                      ? <img src={profile.avatarNftUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                      : <span className="w-6 h-6 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold text-xs font-bold">
                          {profile.username?.[0]?.toUpperCase() || '?'}
                        </span>
                    }
                    <span className="hidden sm:inline max-w-[100px] truncate">{profile.username}</span>
                    <svg className={`w-3 h-3 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {/* Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-brand-navy border border-yellow-900/40 rounded-xl shadow-2xl py-2 z-50">
                      {/* Profile info header */}
                      <div className="px-4 py-2 mb-1 border-b border-yellow-900/20">
                        <p className="text-white font-semibold text-sm truncate">{profile.username}</p>
                        {walletAddress && (
                          <p className="text-gray-500 text-xs font-mono">{formatAddress(walletAddress)}</p>
                        )}
                      </div>

                      <button onClick={() => go('/dashboard')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-brand-gold flex items-center gap-2">
                        <span>👤</span><span>My Profile</span>
                      </button>
                      <button onClick={() => go('/dashboard')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-brand-gold flex items-center gap-2">
                        <span>📊</span><span>My Dashboard</span>
                      </button>
                      <button onClick={() => go('/shop')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-brand-gold flex items-center gap-2">
                        <span>🏪</span><span>Shop Floor</span>
                      </button>

                      {/* Wallet actions inside dropdown */}
                      {!isWalletConnected ? (
                        <button
                          onClick={() => { setIsDropdownOpen(false); openWalletPicker(); }}
                          className="w-full text-left px-4 py-2 text-sm text-brand-gold hover:bg-brand-gold/10 flex items-center gap-2"
                        >
                          <WalletIcon className="w-4 h-4" /><span>Connect Wallet</span>
                        </button>
                      ) : !isCorrectChain ? (
                        <button
                          onClick={() => { setIsDropdownOpen(false); switchToCorrectChain(); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <span>⚠️</span><span>Switch to {chainName}</span>
                        </button>
                      ) : null}

                      {isAdmin && (
                        <button onClick={() => go('/admin')} className="w-full text-left px-4 py-2 text-sm text-brand-gold hover:bg-brand-gold/10 flex items-center gap-2">
                          <span>⚙️</span><span>Admin Panel</span>
                        </button>
                      )}

                      <div className="mt-1 pt-1 border-t border-yellow-900/20">
                        <button onClick={handleDisconnect} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 flex items-center gap-2">
                          <LogOutIcon className="w-4 h-4" /><span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Logged out — Sign In */
                <button onClick={connectWallet} className="btn-metallic-gold py-1.5 px-5 rounded-lg text-sm font-bold">
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
