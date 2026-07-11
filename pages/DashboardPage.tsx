import React, { useState } from 'react';
import LoanView from '../components/LoanView';
import SettingsView from '../components/SettingsView';
import ProfileView from '../components/ProfileView';
import ActivityView from '../components/ActivityView';
import { useAppContext } from '../contexts/AppContext';
import LoanCalculatorModal from '../components/LoanCalculatorModal';
import { CalculatorIcon } from '../components/IconComponents';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'loans' | 'portfolio' | 'profile' | 'activity';

const DashboardPage: React.FC = () => {
    const { profile } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('loans');
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    
    const renderTabContent = () => {
        switch (activeTab) {
            case 'loans':
                return <LoanView />;
            case 'portfolio':
                return <SettingsView />;
            case 'profile':
                return <ProfileView />;
            case 'activity':
                return <ActivityView />;
            default:
                return <LoanView />;
        }
    };
    
    const TabButton: React.FC<{ tabId: Tab, children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 font-semibold rounded-md transition-colors text-sm sm:text-base ${
                activeTab === tabId
                    ? 'bg-brand-gold text-brand-dark'
                    : 'text-gray-400 hover:bg-brand-navy hover:text-white'
            }`}
        >
            {children}
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
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-10">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold">Welcome, {profile.username}</h1>
                        <p className="text-gray-400 mt-1">Manage your loans, view your portfolio, and track your activity.</p>
                    </div>
                    <button 
                        onClick={() => setIsCalculatorOpen(true)}
                        className="mt-4 md:mt-0 bg-brand-navy border border-yellow-900/40 text-gray-300 font-semibold py-2 px-4 rounded-lg hover:border-brand-gold/60 hover:text-brand-gold transition-all duration-300 flex items-center space-x-2"
                    >
                        <CalculatorIcon className="w-5 h-5" />
                        <span>Loan Calculator</span>
                    </button>
                </div>

                <div className="mb-8 border-b border-yellow-900/30">
                    <nav className="flex space-x-2 sm:space-x-4" aria-label="Tabs">
                        <TabButton tabId="loans">My Loans</TabButton>
                        <TabButton tabId="portfolio">Portfolio & Settings</TabButton>
                        <TabButton tabId="profile">My Profile</TabButton>
                        <TabButton tabId="activity">Activity</TabButton>
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
