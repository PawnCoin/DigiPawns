import React, { useState } from 'react';

type IconProps = { className?: string };

// Real crypto logo from jsDelivr CDN (cryptocurrency-icons package)
// Falls back to a gold badge for coins not in the package (e.g. PEPE)
// Coins missing from cryptocurrency-icons (launched after 2021): map to free CoinGecko CDN URLs
const FALLBACK_LOGOS: Record<string, string> = {
  PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
};

// Custom token badge component for project-native coins ($PC, $DIG)
interface CustomBadgeProps { label: string; sub?: string; className?: string; }
export const CustomTokenBadge: React.FC<CustomBadgeProps> = ({ label, sub, className = 'w-8 h-8' }) => (
  <div className={`${className} rounded-full flex-shrink-0 flex flex-col items-center justify-center border border-yellow-500/60`}
    style={{ background: 'linear-gradient(135deg, #6B4A00 0%, #D4A017 40%, #FFF0A0 60%, #C8920E 100%)' }}>
    <span className="font-black text-brand-dark leading-none" style={{ fontSize: 'clamp(5px, 28%, 10px)' }}>{label}</span>
    {sub && <span className="font-bold text-brand-dark/70 leading-none" style={{ fontSize: 'clamp(4px, 22%, 8px)' }}>{sub}</span>}
  </div>
);

export const CryptoLogo: React.FC<{ ticker: string; className?: string }> = ({ ticker, className = 'w-8 h-8' }) => {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [secondaryFailed, setSecondaryFailed] = useState(false);

  const primaryUrl = `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${ticker.toLowerCase()}.svg`;
  const fallbackUrl = FALLBACK_LOGOS[ticker.toUpperCase()];

  if (primaryFailed && (!fallbackUrl || secondaryFailed)) {
    return (
      <div className={`${className} rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center flex-shrink-0`}>
        <span className="text-[7px] font-bold text-brand-gold leading-none">{ticker.slice(0, 4)}</span>
      </div>
    );
  }

  const src = primaryFailed && fallbackUrl ? fallbackUrl : primaryUrl;
  const onErr = primaryFailed ? () => setSecondaryFailed(true) : () => setPrimaryFailed(true);

  return (
    <img
      src={src}
      alt={ticker}
      className={`${className} flex-shrink-0 rounded-full`}
      onError={onErr}
    />
  );
};

// Base Icon Wrapper
const Icon: React.FC<{ children: React.ReactNode; className?: string; viewBox?: string }> = ({ children, className = 'w-6 h-6', viewBox = '0 0 24 24' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} fill="currentColor" className={className}>
    {children}
  </svg>
);

// App Logo — updated to $DIG gold palette
export const DigiPawnsFullLogo: React.FC = () => (
  <div className="flex items-center space-x-2">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0L40 20L20 40L0 20L20 0Z" fill="url(#paint0_linear_1_2)"/>
          <path d="M20 6.66663L33.3333 20L20 33.3333L6.66667 20L20 6.66663Z" fill="url(#paint1_linear_1_2)"/>
          <path d="M20 13.3334L26.6667 20L20 26.6667L13.3333 20L20 13.3334Z" fill="#0B1528"/>
          <defs>
              <linearGradient id="paint0_linear_1_2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"  stopColor="#6B4A00"/>
                  <stop offset="30%" stopColor="#D4A017"/>
                  <stop offset="50%" stopColor="#FFF0A0"/>
                  <stop offset="70%" stopColor="#D4A017"/>
                  <stop offset="100%" stopColor="#6B4A00"/>
              </linearGradient>
              <linearGradient id="paint1_linear_1_2" x1="0" y1="6.66663" x2="40" y2="33.3333" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"  stopColor="#C8920E"/>
                  <stop offset="40%" stopColor="#F5D060"/>
                  <stop offset="60%" stopColor="#FFF0A0"/>
                  <stop offset="100%" stopColor="#C8920E"/>
              </linearGradient>
          </defs>
      </svg>
      <span className="font-bold text-2xl tracking-tight">DigiPawns</span>
  </div>
);

// Generic UI Icons
export const ChevronDownIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" fill="none" stroke="currentColor" /></Icon>;
export const WalletIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L3 14.072V18h14.072l.285-7.121A6.002 6.002 0 0118 8zm-6-4a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" /><path d="M3 6a3 3 0 013-3h10a1 1 0 011 1v2a1 1 0 01-1 1H6a3 3 0 01-3-3z" /></Icon>;
export const LogOutIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" fill="none" stroke="currentColor"/></Icon>;
export const StarIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></Icon>;
export const PlusIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" fill="none" stroke="currentColor"/></Icon>;
export const TrashIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" fill="none" stroke="currentColor"/></Icon>;
export const CheckCircleIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></Icon>;
export const ErrorIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></Icon>;
export const ArrowUpCircleIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" fill="none" stroke="currentColor"/></Icon>;
export const GavelIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></Icon>;
export const CalculatorIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M12 7h.01M15 7h.01M15 14h.01M18 14h.01M18 11h.01M18 7h.01M4 7h1v13H4zM4 7a2 2 0 012-2h12a2 2 0 012 2v13a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" fill="none" stroke="currentColor" /></Icon>;
export const PlusCircleIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor"/></Icon>;
export const UserCircleIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor"/></Icon>;
export const ArchiveIcon: React.FC<IconProps> = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" fill="none" stroke="currentColor"/></Icon>;


// NFT Marketplace Icons (Simplified)
export const OpenSeaIcon: React.FC = () => <Icon className="w-10 h-10"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L12 15v4.93zM13 14.07l7.79-4.86c.13.58.21 1.17.21 1.79 0 4.08-3.05 7.44-7 7.93V14.07zM13 4.07V13L4.21 8.14c1.12-2.22 3.3-3.78 5.79-4.07z" /></Icon>;
export const MagicEdenIcon: React.FC = () => <Icon className="w-10 h-10"><path d="M12 2L4.5 5v14l7.5 3 7.5-3V5L12 2zm0 2.31L17.5 7.69v8.62L12 19.31 6.5 16.31V7.69L12 4.31z" /></Icon>;
export const RaribleIcon: React.FC = () => <Icon className="w-10 h-10"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v4h-2zm0 6h2v2h-2z" /></Icon>;

// NFT Category Icons
const CategoryIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="w-12 h-12">{children}</div>;
export const ArtIcon: React.FC = () => <CategoryIcon><Icon><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5zm4-6h6v2H9v-2zm0-4h6v2H9V9z" /></Icon></CategoryIcon>;
export const GamingIcon: React.FC = () => <CategoryIcon><Icon><path d="M21 6H3v12h18V6zM11 15H8v-2h3v2zm0-3H8v-2h3v2zm4 3h-3v-2h3v2zm0-3h-3v-2h3v2z" /></Icon></CategoryIcon>;
export const CollectiblesIcon: React.FC = () => <CategoryIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12 6c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 10c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" /></Icon></CategoryIcon>;
export const VirtualWorldsIcon: React.FC = () => <CategoryIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L12 15v4.93zM13 14.07l7.79-4.86c.13.58.21 1.17.21 1.79 0 4.08-3.05 7.44-7 7.93V14.07zM13 4.07V13L4.21 8.14c1.12-2.22 3.3-3.78 5.79-4.07z" /></Icon></CategoryIcon>;
export const MusicIcon: React.FC = () => <CategoryIcon><Icon><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></Icon></CategoryIcon>;


// Crypto Currency Icons
const CurrencyIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="w-8 h-8">{children}</div>;
export const BtcIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.5 15h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2z" /></Icon></CurrencyIcon>;
export const EthIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2l-6 10h12L12 2zm0 12l6 4-6 6-6-6 6-4z" /></Icon></CurrencyIcon>;
export const UsdtIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v-2H9V8h4v2h-2v2h2v4z" /></Icon></CurrencyIcon>;
export const UsdcIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3-8h6v2H9v-2z" /></Icon></CurrencyIcon>;
export const BnbIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2L4.5 5v14l7.5 3 7.5-3V5L12 2zm-3.5 12.5L12 16l3.5-1.5L12 13l-3.5 1.5zm0-3L12 13l3.5-1.5L12 10l-3.5 1.5zm0-3L12 10l3.5-1.5L12 7l-3.5 1.5z" /></Icon></CurrencyIcon>;
export const SolIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2l-6 4v8l6 4 6-4V6l-6-4zm0 2.24L16.24 7 12 9.76 7.76 7 12 4.24zM6 8.5l6 4v6l-6-4v-6zm12 0l-6 4v6l6-4v-6z" /></Icon></CurrencyIcon>;
export const XrpIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2.71 13.29l1.42-1.42L9.29 12l1.42-1.41-1.42-1.42L7.88 10.59 6.46 12l1.42 1.41L9.29 15l1.42-1.42-1.42-1.41 1.42-1.42 1.41 1.42-1.41 1.41L12 15.71l-1.41-1.42-1.42 1.42 1.42 1.42L12 18.12l-2.71-2.71z" /></Icon></CurrencyIcon>;
export const AdaIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-12h4v2h-4zm0 4h4v2h-4zm0 4h4v2h-4z" /></Icon></CurrencyIcon>;
export const PepeIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM9 10c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-3 4c-1.66 0-3 1.34-3 3h6c0-1.66-1.34-3-3-3z" /></Icon></CurrencyIcon>;
export const DogeIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-4h8v-2h-8v2zm0-4h8v-2h-8v2z" /></Icon></CurrencyIcon>;
export const AvaxIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2L4.5 5v14l7.5 3 7.5-3V5L12 2zm-1 14.5l-3-1.5v-3l3 1.5v3zm0-4l-3-1.5v-3l3 1.5v3zm2 4l3-1.5v-3l-3 1.5v3zm0-4l3-1.5v-3l-3 1.5v3z" /></Icon></CurrencyIcon>;
export const DotIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12 7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></Icon></CurrencyIcon>;
export const MaticIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2l-6 4v8l6 4 6-4V6l-6-4zm0 2.24L16.24 7 12 9.76 7.76 7 12 4.24zM6 8.5l6 4v6l-6-4v-6zm12 0l-6 4v6l6-4v-6z" /></Icon></CurrencyIcon>;
export const ShibIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-4h8v-2h-8v2zm0-4h8v-2h-8v2z" /></Icon></CurrencyIcon>;
export const TrxIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2L4.5 5v14l7.5 3 7.5-3V5L12 2zm0 2.31L17.5 7.69v8.62L12 19.31 6.5 16.31V7.69L12 4.31z" /></Icon></CurrencyIcon>;
export const LinkIcon: React.FC = () => <CurrencyIcon><Icon><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-8h4v2h-4zm0-4h4v2h-4z" /></Icon></CurrencyIcon>;
