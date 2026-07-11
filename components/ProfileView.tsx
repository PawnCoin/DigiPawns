import React, { useState, useEffect, useCallback } from 'react';
import type { UserProfile, NotificationSettings, Nft } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { fetchNftsForWallet } from '../services/nftService';
import { toast } from 'sonner';
import { CheckCircleIcon } from './IconComponents';

const Toggle: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void }> = ({ label, enabled, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-gray-300">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
            <div className={`block w-14 h-8 rounded-full transition ${enabled ? 'bg-brand-gold' : 'bg-brand-dark'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${enabled ? 'translate-x-6' : ''}`}></div>
        </div>
    </label>
);

const ProfileView: React.FC = () => {
    const { 
        walletAddress, 
        profile: contextProfile, 
        notificationSettings: contextNotifications,
        updateProfile,
        updateNotificationSettings
    } = useAppContext();
    
    const [profile, setProfile] = useState<UserProfile>(contextProfile);
    const [notifications, setNotifications] = useState<NotificationSettings>(contextNotifications);
    
    const [nfts, setNfts] = useState<Nft[]>([]);
    const [isLoadingNfts, setIsLoadingNfts] = useState(false);
    const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        setProfile(contextProfile);
    }, [contextProfile]);

    useEffect(() => {
        setNotifications(contextNotifications);
    }, [contextNotifications]);

    const handleFetchNfts = useCallback(async () => {
        const addressToUse = profile.walletAddress || walletAddress;
        if (!addressToUse) {
            toast.error("Please enter a wallet address first");
            return;
        }
        setIsLoadingNfts(true);
        try {
            const fetchedNfts = await fetchNftsForWallet(addressToUse);
            setNfts(fetchedNfts);
        } catch (error) {
            console.error("Failed to fetch NFTs for avatar selection", error);
            toast.error("Failed to fetch NFTs");
        } finally {
            setIsLoadingNfts(false);
        }
    }, [profile.walletAddress, walletAddress]);

    const handleAvatarSelectClick = () => {
        setIsAvatarSelectorOpen(true);
        handleFetchNfts();
    };

    const handleSetAvatar = (nft: Nft) => {
        setProfile(p => ({ ...p, avatarNftUrl: nft.imageUrl }));
        setIsAvatarSelectorOpen(false);
    };

    const handleSave = () => {
        setSaveStatus('saving');
        updateProfile(profile);
        updateNotificationSettings(notifications);
        
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 1500);
    };

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <h2 className="text-2xl font-semibold mb-2">My Profile</h2>
                <p className="text-gray-400 mb-6">Personalize your DigiPawns experience.</p>
            </div>
            <div className="md:col-span-2 bg-brand-navy p-8 rounded-lg border border-yellow-900/40">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-brand-dark border-2 border-yellow-900/40 flex items-center justify-center overflow-hidden">
                            {profile.avatarNftUrl ? (
                                <img src={profile.avatarNftUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-500 text-xs">No Avatar</span>
                            )}
                        </div>
                        <button onClick={handleAvatarSelectClick} className="absolute -bottom-1 -right-1 bg-brand-gold h-8 w-8 rounded-full flex items-center justify-center text-brand-dark hover:bg-brand-gold-light transition">
                           ✏️
                        </button>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-400">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={profile.username}
                                onChange={(e) => setProfile(p => ({ ...p, username: e.target.value }))}
                                className="mt-1 w-full sm:w-64 bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-gold/60 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-400">Wallet Address (Optional)</label>
                            <input
                                id="walletAddress"
                                type="text"
                                value={profile.walletAddress || ''}
                                onChange={(e) => setProfile(p => ({ ...p, walletAddress: e.target.value }))}
                                placeholder="0x..."
                                className="mt-1 w-full bg-brand-dark border border-yellow-900/40 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-gold/60 font-mono text-sm text-white placeholder-gray-600"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-yellow-900/30 my-8" />

                <h3 className="text-xl font-semibold mb-4">Notification Settings</h3>
                <div className="space-y-4">
                    <Toggle label="Loan repayment due soon" enabled={notifications.loanDueSoon} onChange={val => setNotifications(n => ({ ...n, loanDueSoon: val }))} />
                    <Toggle label="Loan repayment successful" enabled={notifications.repaymentSuccess} onChange={val => setNotifications(n => ({ ...n, repaymentSuccess: val }))} />
                    <Toggle label="Loan has defaulted" enabled={notifications.loanDefaulted} onChange={val => setNotifications(n => ({ ...n, loanDefaulted: val }))} />
                </div>
                
                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} disabled={saveStatus === 'saving'} className="bg-brand-gold text-brand-dark font-bold py-2 px-6 rounded-lg hover:bg-brand-gold-light transition-all duration-300 disabled:bg-gray-500 disabled:text-gray-400 flex items-center">
                        {saveStatus === 'saving' && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-brand-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {saveStatus === 'saved' && <CheckCircleIcon className="w-5 h-5 mr-2" />}
                        {saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {isAvatarSelectorOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-brand-navy border border-yellow-900/40 rounded-2xl p-6 w-full max-w-2xl">
                        <h3 className="text-xl font-semibold mb-4">Select Your Avatar NFT</h3>
                        {isLoadingNfts ? (
                            <p className="text-center py-8 text-gray-400">Loading your NFTs...</p>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 max-h-96 overflow-y-auto">
                                {nfts.map(nft => (
                                    <button key={nft.id} onClick={() => handleSetAvatar(nft)} className="rounded-lg overflow-hidden border-2 border-transparent hover:border-brand-gold hover:scale-105 transition-transform">
                                        <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setIsAvatarSelectorOpen(false)} className="mt-6 w-full bg-brand-dark text-white font-bold py-2.5 px-6 rounded-lg hover:bg-brand-navy border border-yellow-900/40">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileView;
