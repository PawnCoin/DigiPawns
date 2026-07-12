import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import type { UserProfile } from '../types';
import { toast } from 'sonner';

const FriendsView: React.FC = () => {
    const { friends, searchUsers, addFriend, removeFriend, loans } = useAppContext();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const [expandedUid, setExpandedUid] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        try {
            const found = await searchUsers(query.trim());
            setResults(found);
        } catch {
            toast.error('Search failed');
        } finally {
            setSearching(false);
        }
    };

    const isFriend = (uid: string) => friends.some(f => f.uid === uid);

    const handleAddFriend = async (user: UserProfile) => {
        try {
            await addFriend(user);
            toast.success(`${user.username} added as a friend!`);
        } catch { toast.error('Failed to add friend'); }
    };

    const handleRemoveFriend = async (uid: string, name: string) => {
        try {
            await removeFriend(uid);
            toast.success(`${name} removed`);
        } catch { toast.error('Failed to remove friend'); }
    };

    const FriendCard: React.FC<{ user: UserProfile; showRemove?: boolean }> = ({ user, showRemove }) => {
        const isExpanded = expandedUid === user.uid;
        return (
            <div className={`bg-brand-navy/60 border rounded-xl transition-all duration-200 overflow-hidden ${isExpanded ? 'border-brand-gold/50' : 'border-yellow-900/30 hover:border-yellow-900/50'}`}>
                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedUid(isExpanded ? null : (user.uid || null))}>
                    <div className="w-12 h-12 rounded-full bg-brand-dark border-2 border-yellow-900/40 overflow-hidden flex-shrink-0">
                        {user.avatarNftUrl
                            ? <img src={user.avatarNftUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center text-brand-gold text-lg font-black">{user.username?.[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-white font-bold truncate">{user.username}</p>
                            {user.isAdmin && <span className="text-[9px] bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                        </div>
                        <p className="text-gray-500 text-xs font-mono truncate">{user.walletAddress || 'No wallet'}</p>
                        {user.bio && <p className="text-gray-400 text-xs mt-0.5 truncate">{user.bio}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        {showRemove && (
                            <button
                                onClick={e => { e.stopPropagation(); handleRemoveFriend(user.uid!, user.username); }}
                                className="text-red-500 hover:text-red-400 text-xs font-semibold px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                                Remove
                            </button>
                        )}
                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {/* Expanded mini-profile */}
                {isExpanded && (
                    <div className="px-4 pb-4 border-t border-yellow-900/20 mt-0 pt-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center bg-brand-dark/40 rounded-lg p-3">
                                <p className="text-brand-gold font-black text-xl">—</p>
                                <p className="text-gray-500 text-xs">Total Loans</p>
                            </div>
                            <div className="text-center bg-brand-dark/40 rounded-lg p-3">
                                <p className="text-brand-gold font-black text-xl">—</p>
                                <p className="text-gray-500 text-xs">Active</p>
                            </div>
                            <div className="text-center bg-brand-dark/40 rounded-lg p-3">
                                <p className="text-brand-gold font-black text-xl">—</p>
                                <p className="text-gray-500 text-xs">Repaid</p>
                            </div>
                        </div>
                        <p className="text-gray-600 text-xs text-center mt-3">
                            Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'unknown'}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Search */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4">Find Users</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search by username…"
                        className="flex-1 bg-brand-dark border border-yellow-900/40 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-gold/40"
                    />
                    <button onClick={handleSearch} disabled={searching}
                        className="btn-metallic-gold px-5 py-2.5 rounded-lg font-bold text-sm disabled:opacity-50 disabled:[animation:none]">
                        {searching ? 'Searching…' : 'Search'}
                    </button>
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {results.map(user => (
                            <div key={user.uid} className="flex items-center gap-4 bg-brand-navy/50 border border-yellow-900/30 rounded-xl p-4">
                                <div className="w-10 h-10 rounded-full bg-brand-dark border border-yellow-900/40 overflow-hidden flex-shrink-0">
                                    {user.avatarNftUrl
                                        ? <img src={user.avatarNftUrl} alt="" className="w-full h-full object-cover" />
                                        : <span className="w-full h-full flex items-center justify-center text-brand-gold font-bold">{user.username?.[0]?.toUpperCase()}</span>}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-semibold">{user.username}</p>
                                    <p className="text-gray-500 text-xs font-mono">{user.walletAddress || 'No wallet'}</p>
                                </div>
                                {isFriend(user.uid!) ? (
                                    <span className="text-xs text-brand-gold border border-brand-gold/30 px-3 py-1 rounded-full">Friends ✓</span>
                                ) : (
                                    <button onClick={() => handleAddFriend(user)}
                                        className="btn-metallic-gold text-xs px-4 py-1.5 rounded-lg font-bold">
                                        + Add
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {results.length === 0 && query && !searching && (
                    <p className="mt-3 text-gray-500 text-sm">No users found for "{query}".</p>
                )}
            </div>

            {/* Friends list */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4">
                    My Friends <span className="text-gray-500 font-normal text-base">({friends.length})</span>
                </h2>
                {friends.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-4xl mb-3">👥</p>
                        <p>You haven't added any friends yet. Search above to find users.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {friends.map(friend => (
                            <FriendCard key={friend.uid} user={friend} showRemove />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendsView;
