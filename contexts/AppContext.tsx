import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { MOCK_LOANS } from '../mock-data';
import type { Loan, AppContextType, UserProfile, NotificationSettings, Activity, ActivityType } from '../types';
import useRouter from '../hooks/useRouter';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, deleteDoc } from 'firebase/firestore';

// FIX: Extend the Window interface to include ethereum for Web3 wallet interaction.
declare global {
    interface Window {
        ethereum?: any;
    }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper function to get data from localStorage
const getFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { navigate } = useRouter();

    // === STATE INITIALIZATION ===
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [profile, setProfile] = useState<UserProfile>({ username: 'Digital Voyager', avatarNftUrl: null });
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ loanDueSoon: true, repaymentSuccess: true, loanDefaulted: true });
    const [activityLog, setActivityLog] = useState<Activity[]>([]);

    // === FIREBASE AUTH ===
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setIsConnected(true);
            } else {
                setUserId(null);
                setIsConnected(false);
                setLoans([]);
                setActivityLog([]);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // === FIRESTORE SYNC ===
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        // Profile Sync
        const profileUnsub = onSnapshot(doc(db, 'users', userId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                setProfile(data);
                setWalletAddress(data.walletAddress || null);
            } else {
                // Create default profile
                const defaultProfile = {
                    uid: userId,
                    username: auth.currentUser?.displayName || 'Digital Voyager',
                    avatarNftUrl: auth.currentUser?.photoURL || null,
                    walletAddress: null,
                    createdAt: new Date().toISOString()
                };
                setDoc(doc(db, 'users', userId), defaultProfile).catch(console.error);
            }
        }, console.error);

        // Notification Settings Sync
        const notifUnsub = onSnapshot(doc(db, 'notificationSettings', userId), (docSnap) => {
            if (docSnap.exists()) {
                setNotificationSettings(docSnap.data() as NotificationSettings);
            } else {
                const defaultSettings = {
                    uid: userId,
                    loanDueSoon: true,
                    repaymentSuccess: true,
                    loanDefaulted: true
                };
                setDoc(doc(db, 'notificationSettings', userId), defaultSettings).catch(console.error);
            }
        }, console.error);

        // Loans Sync
        const qLoans = query(collection(db, 'loans'), where('uid', '==', userId));
        const loansUnsub = onSnapshot(qLoans, (snapshot) => {
            const fetchedLoans = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    nft: {
                        name: data.nftName || 'Unknown NFT',
                        collection: data.nftCollection || 'Unknown Collection',
                        imageUrl: data.nftImageUrl || ''
                    }
                } as Loan;
            });
            setLoans(fetchedLoans.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        }, console.error);

        // Activity Sync
        const qActivity = query(collection(db, 'activities'), where('uid', '==', userId));
        const activityUnsub = onSnapshot(qActivity, (snapshot) => {
            const fetchedActivities = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
            setActivityLog(fetchedActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }, console.error);

        return () => {
            profileUnsub();
            notifUnsub();
            loansUnsub();
            activityUnsub();
        };
    }, [isAuthReady, userId]);

    // === ACTIVITY LOGGING ===
    const logActivity = useCallback(async (type: ActivityType, description: string) => {
        if (!userId) return;
        const newActivity = {
            uid: userId,
            type,
            description,
            timestamp: new Date().toISOString()
        };
        try {
            await setDoc(doc(collection(db, 'activities')), newActivity);
        } catch (error) {
            console.error("Failed to log activity", error);
        }
    }, [userId]);

    // === WALLET / AUTH MANAGEMENT ===
    const connectWallet = useCallback(async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate('/dashboard');
        } catch (error) {
            console.error("Authentication failed", error);
            toast.error("Authentication failed");
        }
    }, [navigate]);

    const disconnectWallet = useCallback(async () => {
        try {
            await signOut(auth);
            setIsConnected(false);
            setWalletAddress(null);
            navigate('/');
        } catch (error) {
            console.error("Sign out failed", error);
        }
    }, [navigate]);

    // === CORE LOGIC FUNCTIONS ===
    const addLoan = async (loan: Loan) => {
        if (!userId) return;
        try {
            const newLoan = {
                uid: userId,
                nftName: loan.nft.name,
                nftCollection: loan.nft.collection,
                nftImageUrl: loan.nft.imageUrl,
                principal: loan.principal,
                interestRate: loan.interestRate,
                dueDate: loan.dueDate,
                repaymentAmount: loan.repaymentAmount,
                status: loan.status,
                createdAt: new Date().toISOString()
            };
            const docRef = doc(collection(db, 'loans'));
            await setDoc(docRef, newLoan);
            logActivity('loan-created', `Loan for ${loan.nft.name} ($${loan.principal.toLocaleString()}) created.`);
            toast.success(`Loan created for ${loan.nft.name}!`);
            navigate('/dashboard');
        } catch (error) {
            console.error("Failed to create loan", error);
            toast.error("Failed to create loan");
        }
    };

    const repayLoan = async (loanId: string) => {
        if (!userId) return;
        try {
            const loan = loans.find(l => l.id === loanId);
            if (!loan) return;
            
            await setDoc(doc(db, 'loans', loanId), { status: 'Repaid' }, { merge: true });
            logActivity('loan-repaid', `Loan for ${loan.nft?.name || loan.nftName} repaid successfully.`);
            if (notificationSettings.repaymentSuccess) {
                toast.success(`Loan for ${loan.nft?.name || loan.nftName} repaid successfully!`);
            }
        } catch (error) {
            console.error("Failed to repay loan", error);
            toast.error("Failed to repay loan");
        }
    };
    
    const liquidateLoan = async (loanId: string) => {
        if (!userId) return;
        try {
            const loan = loans.find(l => l.id === loanId);
            if (!loan) return;

            await setDoc(doc(db, 'loans', loanId), { status: 'Liquidated' }, { merge: true });
            logActivity('loan-liquidated', `Collateral for ${loan.nft?.name || loan.nftName} was liquidated.`);
            if (notificationSettings.loanDefaulted) {
                toast.error(`Loan for ${loan.nft?.name || loan.nftName} liquidated.`);
            }
        } catch (error) {
            console.error("Failed to liquidate loan", error);
            toast.error("Failed to liquidate loan");
        }
    };

    const updateProfile = async (newProfile: UserProfile) => {
        if (!userId) return;
        try {
            await setDoc(doc(db, 'users', userId), {
                ...newProfile,
                uid: userId,
                createdAt: profile.createdAt || new Date().toISOString()
            }, { merge: true });
            logActivity('profile-updated', `Profile updated. Username is now "${newProfile.username}".`);
            toast.success('Profile updated successfully!');
        } catch (error) {
            console.error("Failed to update profile", error);
            toast.error("Failed to update profile");
        }
    };

    const updateNotificationSettings = async (settings: NotificationSettings) => {
        if (!userId) return;
        try {
            await setDoc(doc(db, 'notificationSettings', userId), {
                ...settings,
                uid: userId
            }, { merge: true });
            toast.success('Notification settings saved.');
        } catch (error) {
            console.error("Failed to update notification settings", error);
            toast.error("Failed to update notification settings");
        }
    };


    const value: AppContextType = {
        isConnected,
        walletAddress,
        loans,
        profile,
        notificationSettings,
        activityLog,
        navigate,
        connectWallet,
        disconnectWallet,
        addLoan,
        repayLoan,
        liquidateLoan,
        updateProfile,
        updateNotificationSettings,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};