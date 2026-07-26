import React, { useState } from 'react';
import LoanView from '../components/LoanView';
import SettingsView from '../components/SettingsView';
import ProfileView from '../components/ProfileView';
import ActivityView from '../components/ActivityView';
import FriendsView from '../components/FriendsView';
import MessagesView from '../components/MessagesView';
import TokenBalancesCard from '../components/TokenBalancesCard';
import { useAppContext } from '../contexts/AppContext';
import LoanCalculatorModal from '../components/LoanCalculatorModal';
import { CalculatorIcon } from '../components/IconComponents';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'loans' | 'portfolio' | 'profile' | 'activity' | 'friends' | 'messages';

const DashboardPage: React.FC = () => {
    const { profile, isAdmin, navigate, messages, userId, isWalletConnected, openWalletPicker } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('loans');
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [walletNudgeDismissed, setWalletNudgeDismissed] = useState(false);

    const unreadCount = messages.filter(m => m.toUid === userId && !m.read).length;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'loans':
                return (
                    <>
                        <TokenBalancesCard />
                        <LoanView />
                    </>
                );
            case 'portfolio':  return <SettingsView />;
            case 'profile':    return <ProfileView />;
            case 'activity':   return <ActivityView />;
            case 'friends':    return <FriendsView />;
            case 'messages':   return <MessagesView />;
            default:           return <LoanView />;
        }
    };

    const TabButton: React.FC<{ tabId: Tab; children: React.ReactNode; badge?: number }> = ({ tabId, children, badge }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`relative px-4 py-2 font-semibold rounded-md transition-colors text-sm sm:text-base ${
                activeTab === tabId
                    ? 'bg-brand-gold text-brand-dark'
                    : 'text-gray-400 hover:bg-brand-navy hover:text-white'
            }`}
        >
            {children}
            {badge != null && badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </button>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Wallet nudge — shown once until dismissed, only when signed in but no crypto wallet linked */}
                {!isWalletConnected && !walletNudgeDismissed && (
                    <div className="mb-6 flex items-center justify-between gap-4 bg-brand-gold/10 border border-brand-gold/30 rounded-xl px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🔗</span>
                            <div>
                                <p className="text-sm font-semibold text-white">Link a crypto wallet to unlock loans and trading</p>
                                <p className="text-xs text-gray-400 mt-0.5">Your DigiPawns account is ready — connect MetaMask or any wallet to go on-chain.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={openWalletPicker}
                                className="btn-metallic-gold py-1.5 px-4 rounded-lg text-sm font-bold whitespace-nowrap"
                            >
                                Connect Wallet
                            </button>
                            <button
                                onClick={() => setWalletNudgeDismissed(true)}
                                className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
                                aria-label="Dismiss"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between md:items-center mb-10">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold">Welcome, {profile.username}</h1>
                        <p className="text-gray-400 mt-1">Manage your loans, profile, and connect with others.</p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        {isAdmin && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="btn-metallic-gold py-2 px-4 rounded-lg font-bold text-sm flex items-center gap-2"
                            >
                                ⚙️ Admin Panel
                            </button>
                        )}
                        <button
                            onClick={() => setIsCalculatorOpen(true)}
                            className="bg-brand-navy border border-yellow-900/40 text-gray-300 font-semibold py-2 px-4 rounded-lg hover:border-brand-gold/60 hover:text-brand-gold transition-all duration-300 flex items-center space-x-2"
                        >
                            <CalculatorIcon className="w-5 h-5" />
                            <span>Calculator</span>
                        </button>
                    </div>
                </div>

                <div className="mb-8 border-b border-yellow-900/30">
                    <nav className="flex flex-wrap gap-1 sm:gap-2" aria-label="Tabs">
                        <TabButton tabId="loans">My Loans</TabButton>
                        <TabButton tabId="portfolio">Portfolio</TabButton>
                        <TabButton tabId="profile">Profile</TabButton>
                        <TabButton tabId="activity">Activity</TabButton>
                        <TabButton tabId="friends">Friends</TabButton>
                        <TabButton tabId="messages" badge={unreadCount}>Messages</TabButton>
                    </nav>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderTabContent()}
                    </motion.div>
                </AnimatePresence>
            </main>

            <LoanCalculatorModal
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
            />
        </motion.div>
    );
};

export default DashboardPage;
