import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import type { Loan, AppContextType, UserProfile, NotificationSettings, Activity, ActivityType, Friend, Message, Collection } from '../types';
import useRouter from '../hooks/useRouter';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import {
    collection, doc, setDoc, onSnapshot, query, where,
    deleteDoc, getDocs, limit, addDoc, writeBatch
} from 'firebase/firestore';

declare global {
    interface Window { ethereum?: any; }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getConversationId = (a: string, b: string) => [a, b].sort().join('_');

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { navigate } = useRouter();

    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [profile, setProfile] = useState<UserProfile>({ username: 'Digital Voyager', avatarNftUrl: null });
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ loanDueSoon: true, repaymentSuccess: true, loanDefaulted: true });
    const [activityLog, setActivityLog] = useState<Activity[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [allLoans, setAllLoans] = useState<Loan[]>([]);

    // ── Firebase Auth ──────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setIsConnected(true);
            } else {
                setUserId(null);
                setIsConnected(false);
                setIsAdmin(false);
                setLoans([]);
                setActivityLog([]);
                setFriends([]);
                setMessages([]);
            }
            setIsAuthReady(true);
        });
        return unsub;
    }, []);

    // ── Collections (public, always loaded) ───────────────────────────────────
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'collections'), snap => {
            const cols = snap.docs.map(d => ({ id: d.id, ...d.data() } as Collection));
            setCollections(cols.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        }, console.error);
        return unsub;
    }, []);

    // ── User-specific Firestore listeners ──────────────────────────────────────
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        // Profile
        const profileUnsub = onSnapshot(doc(db, 'users', userId), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                setProfile(data);
                setWalletAddress(data.walletAddress || null);
                setIsAdmin(data.isAdmin === true);
            } else {
                const defaultProfile: UserProfile = {
                    uid: userId,
                    username: auth.currentUser?.displayName || 'Digital Voyager',
                    avatarNftUrl: auth.currentUser?.photoURL || null,
                    walletAddress: null,
                    isAdmin: false,
                    createdAt: new Date().toISOString(),
                };
                setDoc(doc(db, 'users', userId), defaultProfile).catch(console.error);
            }
        }, console.error);

        // Notification settings
        const notifUnsub = onSnapshot(doc(db, 'notificationSettings', userId), (snap) => {
            if (snap.exists()) {
                setNotificationSettings(snap.data() as NotificationSettings);
            } else {
                const defaults = { uid: userId, loanDueSoon: true, repaymentSuccess: true, loanDefaulted: true };
                setDoc(doc(db, 'notificationSettings', userId), defaults).catch(console.error);
            }
        }, console.error);

        // Loans
        const loansUnsub = onSnapshot(query(collection(db, 'loans'), where('uid', '==', userId)), snap => {
            const fetched = snap.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, nft: { name: data.nftName || 'Unknown NFT', collection: data.nftCollection || 'Unknown', imageUrl: data.nftImageUrl || '' } } as Loan;
            });
            setLoans(fetched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        }, console.error);

        // Activity
        const activityUnsub = onSnapshot(query(collection(db, 'activities'), where('uid', '==', userId)), snap => {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
            setActivityLog(fetched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }, console.error);

        // Friends
        const friendsUnsub = onSnapshot(query(collection(db, 'friends'), where('uid', '==', userId)), snap => {
            setFriends(snap.docs.map(d => d.data() as Friend));
        }, console.error);

        // Messages (incoming + outgoing)
        const msgsInUnsub = onSnapshot(query(collection(db, 'messages'), where('toUid', '==', userId)), snap => {
            const inMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
            setMessages(prev => {
                const outgoing = prev.filter(m => m.fromUid === userId);
                const merged = [...outgoing, ...inMsgs];
                const unique = Array.from(new Map(merged.map(m => [m.id, m])).values());
                return unique;
            });
        }, console.error);

        const msgsOutUnsub = onSnapshot(query(collection(db, 'messages'), where('fromUid', '==', userId)), snap => {
            const outMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
            setMessages(prev => {
                const incoming = prev.filter(m => m.toUid === userId);
                const merged = [...incoming, ...outMsgs];
                const unique = Array.from(new Map(merged.map(m => [m.id, m])).values());
                return unique;
            });
        }, console.error);

        return () => {
            profileUnsub(); notifUnsub(); loansUnsub(); activityUnsub();
            friendsUnsub(); msgsInUnsub(); msgsOutUnsub();
        };
    }, [isAuthReady, userId]);

    // ── Admin-only listeners ───────────────────────────────────────────────────
    useEffect(() => {
        if (!isAdmin || !userId) return;
        const usersUnsub = onSnapshot(collection(db, 'users'), snap => {
            setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        }, console.error);
        const loansUnsub = onSnapshot(collection(db, 'loans'), snap => {
            const fetched = snap.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, nft: { name: data.nftName || 'Unknown', collection: data.nftCollection || '', imageUrl: data.nftImageUrl || '' } } as Loan;
            });
            setAllLoans(fetched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        }, console.error);
        return () => { usersUnsub(); loansUnsub(); };
    }, [isAdmin, userId]);

    // ── Activity logging ───────────────────────────────────────────────────────
    const logActivity = useCallback(async (type: ActivityType, description: string) => {
        if (!userId) return;
        await setDoc(doc(collection(db, 'activities')), { uid: userId, type, description, timestamp: new Date().toISOString() }).catch(console.error);
    }, [userId]);

    // ── Auth ───────────────────────────────────────────────────────────────────
    const connectWallet = useCallback(async () => {
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
            navigate('/dashboard');
        } catch { toast.error('Authentication failed'); }
    }, [navigate]);

    const disconnectWallet = useCallback(async () => {
        try {
            await signOut(auth);
            setIsConnected(false);
            setWalletAddress(null);
            navigate('/');
        } catch { console.error('Sign out failed'); }
    }, [navigate]);

    // ── Loan actions ───────────────────────────────────────────────────────────
    const addLoan = async (loan: Loan) => {
        if (!userId) return;
        try {
            const newLoan = {
                uid: userId,
                nftName: loan.nft.name,
                nftCollection: loan.nft.collection,
                nftImageUrl: loan.nft.imageUrl,
                contractAddress: loan.contractAddress || '',
                tokenId: loan.tokenId || '',
                nftChain: loan.nftChain || 'Ethereum',
                principal: loan.principal,
                interestRate: loan.interestRate,
                dueDate: loan.dueDate,
                repaymentAmount: loan.repaymentAmount,
                status: loan.status,
                nftTransferStatus: 'awaiting_transfer',
                createdAt: new Date().toISOString(),
            };
            await setDoc(doc(collection(db, 'loans')), newLoan);
            logActivity('loan-created', `Loan for ${loan.nft.name} ($${loan.principal.toLocaleString()}) created.`);
            toast.success(`Loan created for ${loan.nft.name}!`);
            navigate('/dashboard');
        } catch { toast.error('Failed to create loan'); }
    };

    const repayLoan = async (loanId: string) => {
        if (!userId) return;
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        await setDoc(doc(db, 'loans', loanId), { status: 'Repaid', nftTransferStatus: 'returned' }, { merge: true });
        logActivity('loan-repaid', `Loan for ${loan.nft?.name || loan.nftName} repaid successfully.`);
        if (notificationSettings.repaymentSuccess) toast.success(`Loan repaid! Your NFT will be returned.`);
    };

    const liquidateLoan = async (loanId: string) => {
        if (!userId) return;
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        await setDoc(doc(db, 'loans', loanId), { status: 'Liquidated', nftTransferStatus: 'liquidated' }, { merge: true });
        logActivity('loan-liquidated', `Collateral for ${loan.nft?.name || loan.nftName} was liquidated.`);
        if (notificationSettings.loanDefaulted) toast.error(`Loan liquidated.`);
    };

    // ── Profile ────────────────────────────────────────────────────────────────
    const updateProfile = async (newProfile: UserProfile) => {
        if (!userId) return;
        await setDoc(doc(db, 'users', userId), { ...newProfile, uid: userId, createdAt: profile.createdAt || new Date().toISOString() }, { merge: true });
        logActivity('profile-updated', `Profile updated to "${newProfile.username}".`);
        toast.success('Profile updated!');
    };

    const updateNotificationSettings = async (settings: NotificationSettings) => {
        if (!userId) return;
        await setDoc(doc(db, 'notificationSettings', userId), { ...settings, uid: userId }, { merge: true });
        toast.success('Settings saved.');
    };

    // ── Social ─────────────────────────────────────────────────────────────────
    const searchUsers = async (q: string): Promise<UserProfile[]> => {
        const snap = await getDocs(query(
            collection(db, 'users'),
            where('username', '>=', q),
            where('username', '<=', q + '\uf8ff'),
            limit(10)
        ));
        return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)).filter(u => u.uid !== userId);
    };

    const addFriend = async (user: UserProfile) => {
        if (!userId) return;
        const friendId = getConversationId(userId, user.uid!);
        await setDoc(doc(db, 'friends', `${userId}_${user.uid}`), {
            uid: userId, friendUid: user.uid, username: user.username,
            avatarNftUrl: user.avatarNftUrl, addedAt: new Date().toISOString(),
        });
        // Also add reverse
        await setDoc(doc(db, 'friends', `${user.uid}_${userId}`), {
            uid: user.uid, friendUid: userId, username: profile.username,
            avatarNftUrl: profile.avatarNftUrl, addedAt: new Date().toISOString(),
        });
    };

    const removeFriend = async (friendUid: string) => {
        if (!userId) return;
        await deleteDoc(doc(db, 'friends', `${userId}_${friendUid}`));
        await deleteDoc(doc(db, 'friends', `${friendUid}_${userId}`));
    };

    const sendMessage = async (toUid: string, toUsername: string, text: string) => {
        if (!userId) return;
        const convId = getConversationId(userId, toUid);
        await addDoc(collection(db, 'messages'), {
            conversationId: convId,
            fromUid: userId,
            fromUsername: profile.username,
            toUid,
            toUsername,
            text,
            timestamp: new Date().toISOString(),
            read: false,
        });
    };

    const markConversationRead = async (conversationId: string) => {
        if (!userId) return;
        const snap = await getDocs(query(
            collection(db, 'messages'),
            where('conversationId', '==', conversationId),
            where('toUid', '==', userId),
            where('read', '==', false)
        ));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    };

    // ── Admin ──────────────────────────────────────────────────────────────────
    const adminUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
        await setDoc(doc(db, 'users', uid), data, { merge: true });
    };

    const adminDeleteUser = async (uid: string) => {
        await deleteDoc(doc(db, 'users', uid));
    };

    const adminUpdateLoan = async (loanId: string, data: Partial<Loan>) => {
        await setDoc(doc(db, 'loans', loanId), data, { merge: true });
    };

    const adminDeleteLoan = async (loanId: string) => {
        await deleteDoc(doc(db, 'loans', loanId));
    };

    const adminAddCollection = async (col: Omit<Collection, 'id' | 'createdAt'>) => {
        await addDoc(collection(db, 'collections'), { ...col, createdAt: new Date().toISOString() });
    };

    const adminUpdateCollection = async (id: string, data: Partial<Collection>) => {
        await setDoc(doc(db, 'collections', id), data, { merge: true });
    };

    const adminDeleteCollection = async (id: string) => {
        await deleteDoc(doc(db, 'collections', id));
    };

    const value: AppContextType = {
        isConnected, isAdmin, userId, walletAddress, loans, profile,
        notificationSettings, activityLog, friends, messages, collections,
        allUsers, allLoans,
        navigate, connectWallet, disconnectWallet,
        addLoan, repayLoan, liquidateLoan,
        updateProfile, updateNotificationSettings,
        searchUsers, addFriend, removeFriend, sendMessage, markConversationRead,
        adminUpdateUser, adminDeleteUser, adminUpdateLoan, adminDeleteLoan,
        adminAddCollection, adminUpdateCollection, adminDeleteCollection,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};
