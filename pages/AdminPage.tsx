import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { Collection, Loan, UserProfile, ShopItem } from '../types';
import { toast } from 'sonner';

type AdminTab = 'users' | 'loans' | 'collections' | 'shop';

const LOAN_STATUSES = ['Active', 'Repaid', 'Defaulted', 'Liquidated'];
const TRANSFER_STATUSES = ['awaiting_transfer', 'received', 'active', 'returned', 'liquidated'];
const NFT_CHAINS = ['Ethereum', 'Solana', 'Polygon', 'BNB Chain', 'Avalanche'];

const emptyCollection = (): Omit<Collection, 'id' | 'createdAt'> => ({
    name: '', description: '', imageUrl: '', chain: 'Ethereum',
    floorPrice: 0, currency: 'ETH', totalItems: 0, verified: false, website: '',
});

const emptyShopItem = (): Omit<ShopItem, 'id' | 'listedAt' | 'source'> => ({
    name: '', collection: '', imageUrl: '', category: 'Art', chain: 'Ethereum', price: 0,
});

const AdminPage: React.FC = () => {
    const { isAdmin, navigate, allUsers, allLoans, collections, shopInventory,
        adminUpdateUser, adminDeleteUser, adminUpdateLoan, adminDeleteLoan,
        adminAddCollection, adminUpdateCollection, adminDeleteCollection,
        adminAddShopItem, adminUpdateShopItem, adminDeleteShopItem } = useAppContext();

    const [tab, setTab] = useState<AdminTab>('users');
    const [collectionForm, setCollectionForm] = useState(emptyCollection());
    const [editingCollection, setEditingCollection] = useState<string | null>(null);
    const [showCollectionForm, setShowCollectionForm] = useState(false);
    const [shopItemForm, setShopItemForm] = useState(emptyShopItem());
    const [editingShopItem, setEditingShopItem] = useState<string | null>(null);
    const [showShopItemForm, setShowShopItemForm] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; label: string } | null>(null);

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <p className="text-4xl mb-4">🚫</p>
                <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-gray-400 mb-6">You don't have permission to view this page.</p>
                <button onClick={() => navigate('/')} className="btn-metallic-gold px-6 py-2 rounded-lg">Go Home</button>
            </div>
        );
    }

    const TabBtn: React.FC<{ id: AdminTab; label: string; count: number }> = ({ id, label, count }) => (
        <button onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${tab === id ? 'btn-metallic-gold' : 'text-gray-400 hover:text-white hover:bg-brand-navy border border-transparent hover:border-yellow-900/40'}`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-black/20 text-brand-dark' : 'bg-brand-navy text-gray-400'}`}>{count}</span>
        </button>
    );

    const handleCollectionSave = async () => {
        if (!collectionForm.name.trim()) { toast.error('Collection name is required'); return; }
        try {
            if (editingCollection) {
                await adminUpdateCollection(editingCollection, collectionForm);
                toast.success('Collection updated');
            } else {
                await adminAddCollection(collectionForm);
                toast.success('Collection added');
            }
            setCollectionForm(emptyCollection());
            setEditingCollection(null);
            setShowCollectionForm(false);
        } catch { toast.error('Failed to save collection'); }
    };

    const handleShopItemSave = async () => {
        if (!shopItemForm.name.trim()) { toast.error('Item name is required'); return; }
        try {
            if (editingShopItem) {
                await adminUpdateShopItem(editingShopItem, shopItemForm);
                toast.success('Item updated');
            } else {
                await adminAddShopItem(shopItemForm);
                toast.success('Item added to the shop floor');
            }
            setShopItemForm(emptyShopItem());
            setEditingShopItem(null);
            setShowShopItemForm(false);
        } catch { toast.error('Failed to save item'); }
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'user') await adminDeleteUser(confirmDelete.id);
            else if (confirmDelete.type === 'loan') await adminDeleteLoan(confirmDelete.id);
            else if (confirmDelete.type === 'collection') await adminDeleteCollection(confirmDelete.id);
            else if (confirmDelete.type === 'shopItem') await adminDeleteShopItem(confirmDelete.id);
            toast.success('Deleted successfully');
        } catch { toast.error('Delete failed'); }
        setConfirmDelete(null);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <span className="text-xs font-bold tracking-widest uppercase text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-3 py-1 rounded-full">Admin Panel</span>
                        <h1 className="text-3xl font-bold text-white mt-2">Platform Management</h1>
                        <p className="text-gray-400">Full control over users, loans, and collections.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 mb-8 flex-wrap">
                    <TabBtn id="users" label="Users" count={allUsers.length} />
                    <TabBtn id="loans" label="All Loans" count={allLoans.length} />
                    <TabBtn id="collections" label="Collections" count={collections.length} />
                    <TabBtn id="shop" label="Shop Floor" count={shopInventory.length} />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                        {/* ── USERS TAB ── */}
                        {tab === 'users' && (
                            <div className="overflow-x-auto rounded-xl border border-yellow-900/30">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-brand-navy/80 text-gray-400 text-left">
                                            <th className="px-4 py-3 font-semibold">User</th>
                                            <th className="px-4 py-3 font-semibold">Wallet</th>
                                            <th className="px-4 py-3 font-semibold">Admin</th>
                                            <th className="px-4 py-3 font-semibold">Joined</th>
                                            <th className="px-4 py-3 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-yellow-900/20">
                                        {allUsers.map(user => (
                                            <tr key={user.uid} className="bg-brand-dark/40 hover:bg-brand-navy/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-brand-navy border border-yellow-900/40 overflow-hidden flex-shrink-0">
                                                            {user.avatarNftUrl
                                                                ? <img src={user.avatarNftUrl} alt="" className="w-full h-full object-cover" />
                                                                : <span className="w-full h-full flex items-center justify-center text-brand-gold text-xs font-bold">{user.username?.[0]?.toUpperCase()}</span>}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium">{user.username}</p>
                                                            <p className="text-gray-500 text-xs font-mono">{user.uid?.slice(0, 12)}…</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                                                    {user.walletAddress ? `${user.walletAddress.slice(0, 8)}…` : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => adminUpdateUser(user.uid!, { isAdmin: !user.isAdmin })}
                                                        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${user.isAdmin ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40 hover:bg-red-900/30 hover:text-red-400 hover:border-red-500/40' : 'bg-brand-dark text-gray-500 border border-yellow-900/30 hover:bg-brand-gold/10 hover:text-brand-gold hover:border-brand-gold/30'}`}>
                                                        {user.isAdmin ? 'Admin ✓' : 'User'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => setConfirmDelete({ type: 'user', id: user.uid!, label: user.username })}
                                                        className="text-red-500 hover:text-red-400 text-xs font-semibold px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {allUsers.length === 0 && (
                                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── LOANS TAB ── */}
                        {tab === 'loans' && (
                            <div className="overflow-x-auto rounded-xl border border-yellow-900/30">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-brand-navy/80 text-gray-400 text-left">
                                            <th className="px-4 py-3 font-semibold">NFT / User</th>
                                            <th className="px-4 py-3 font-semibold">Principal</th>
                                            <th className="px-4 py-3 font-semibold">Status</th>
                                            <th className="px-4 py-3 font-semibold">NFT Transfer</th>
                                            <th className="px-4 py-3 font-semibold">Due Date</th>
                                            <th className="px-4 py-3 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-yellow-900/20">
                                        {allLoans.map(loan => (
                                            <tr key={loan.id} className="bg-brand-dark/40 hover:bg-brand-navy/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="text-white font-medium">{loan.nftName || loan.nft?.name}</p>
                                                    <p className="text-gray-500 text-xs font-mono">{loan.uid?.slice(0, 10)}…</p>
                                                </td>
                                                <td className="px-4 py-3 text-brand-gold font-semibold">
                                                    ${loan.principal?.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={loan.status}
                                                        onChange={e => adminUpdateLoan(loan.id, { status: e.target.value as any })}
                                                        className="bg-brand-dark border border-yellow-900/40 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/40">
                                                        {LOAN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={loan.nftTransferStatus || 'awaiting_transfer'}
                                                        onChange={e => adminUpdateLoan(loan.id, { nftTransferStatus: e.target.value as any })}
                                                        className="bg-brand-dark border border-yellow-900/40 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/40">
                                                        {TRANSFER_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">
                                                    {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => setConfirmDelete({ type: 'loan', id: loan.id, label: loan.nftName || loan.nft?.name || 'loan' })}
                                                        className="text-red-500 hover:text-red-400 text-xs font-semibold px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {allLoans.length === 0 && (
                                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No loans yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── COLLECTIONS TAB ── */}
                        {tab === 'collections' && (
                            <div>
                                <div className="flex justify-end mb-4">
                                    <button onClick={() => { setCollectionForm(emptyCollection()); setEditingCollection(null); setShowCollectionForm(true); }}
                                        className="btn-metallic-gold px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                                        <span>+</span> Add Collection
                                    </button>
                                </div>

                                {/* Collection form */}
                                {showCollectionForm && (
                                    <div className="mb-6 p-6 rounded-xl border border-brand-gold/30 bg-brand-navy/60">
                                        <h3 className="font-bold text-white mb-4">{editingCollection ? 'Edit Collection' : 'New Collection'}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {([['name', 'Collection Name', 'text'], ['description', 'Description', 'text'], ['imageUrl', 'Image URL', 'text'], ['website', 'Website URL', 'text'], ['floorPrice', 'Floor Price', 'number'], ['totalItems', 'Total Items', 'number'], ['currency', 'Currency (ETH/SOL)', 'text']] as [keyof typeof collectionForm, string, string][]).map(([field, label, type]) => (
                                                <div key={field}>
                                                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                                                    <input type={type} value={(collectionForm as any)[field]}
                                                        onChange={e => setCollectionForm(f => ({ ...f, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                                                        className="w-full bg-brand-dark border border-yellow-900/40 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold/40" />
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Chain</label>
                                                <select value={collectionForm.chain} onChange={e => setCollectionForm(f => ({ ...f, chain: e.target.value }))}
                                                    className="w-full bg-brand-dark border border-yellow-900/40 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold/40">
                                                    {NFT_CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <label className="text-xs text-gray-400">Verified</label>
                                                <input type="checkbox" checked={collectionForm.verified}
                                                    onChange={e => setCollectionForm(f => ({ ...f, verified: e.target.checked }))}
                                                    className="accent-brand-gold w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={handleCollectionSave} className="btn-metallic-gold px-5 py-2 rounded-lg text-sm font-bold">Save</button>
                                            <button onClick={() => setShowCollectionForm(false)} className="px-5 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-yellow-900/30 hover:border-yellow-900/50 transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {collections.map(col => (
                                        <div key={col.id} className="bg-brand-navy/60 border border-yellow-900/30 rounded-xl overflow-hidden hover:border-brand-gold/40 transition-colors">
                                            <div className="h-32 bg-brand-dark/50 relative overflow-hidden">
                                                {col.imageUrl
                                                    ? <img src={col.imageUrl} alt={col.name} className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">🖼️</div>}
                                                {col.verified && <span className="absolute top-2 right-2 bg-brand-gold text-brand-dark text-[10px] font-black px-2 py-0.5 rounded-full">✓ VERIFIED</span>}
                                            </div>
                                            <div className="p-4">
                                                <h4 className="font-bold text-white">{col.name}</h4>
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{col.description}</p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-brand-gold font-semibold text-sm">{col.floorPrice} {col.currency}</span>
                                                    <span className="text-gray-500 text-xs">{col.chain}</span>
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => { setCollectionForm({ name: col.name, description: col.description, imageUrl: col.imageUrl, chain: col.chain, floorPrice: col.floorPrice, currency: col.currency, totalItems: col.totalItems, verified: col.verified, website: col.website || '' }); setEditingCollection(col.id); setShowCollectionForm(true); }}
                                                        className="flex-1 text-xs py-1.5 rounded border border-yellow-900/40 text-gray-300 hover:text-brand-gold hover:border-brand-gold/40 transition-colors">Edit</button>
                                                    <button onClick={() => setConfirmDelete({ type: 'collection', id: col.id, label: col.name })}
                                                        className="flex-1 text-xs py-1.5 rounded border border-red-900/40 text-red-500 hover:bg-red-900/20 transition-colors">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {collections.length === 0 && (
                                        <div className="col-span-3 text-center py-12 text-gray-500">No collections yet. Add one above.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── SHOP FLOOR TAB ── */}
                        {tab === 'shop' && (
                            <div>
                                <div className="flex justify-end mb-4">
                                    <button onClick={() => { setShopItemForm(emptyShopItem()); setEditingShopItem(null); setShowShopItemForm(true); }}
                                        className="btn-metallic-gold px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                                        <span>+</span> Add Item to Shop Floor
                                    </button>
                                </div>

                                {showShopItemForm && (
                                    <div className="mb-6 p-6 rounded-xl border border-brand-gold/30 bg-brand-navy/60">
                                        <h3 className="font-bold text-white mb-4">{editingShopItem ? 'Edit Item' : 'New Shop Item'}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {([['name', 'Item Name', 'text'], ['collection', 'Collection', 'text'], ['imageUrl', 'Image URL', 'text'], ['category', 'Category', 'text'], ['price', 'Price (USD)', 'number']] as [keyof typeof shopItemForm, string, string][]).map(([field, label, type]) => (
                                                <div key={field}>
                                                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                                                    <input type={type} value={(shopItemForm as any)[field]}
                                                        onChange={e => setShopItemForm(f => ({ ...f, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                                                        className="w-full bg-brand-dark border border-yellow-900/40 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold/40" />
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Chain</label>
                                                <select value={shopItemForm.chain} onChange={e => setShopItemForm(f => ({ ...f, chain: e.target.value }))}
                                                    className="w-full bg-brand-dark border border-yellow-900/40 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold/40">
                                                    {NFT_CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={handleShopItemSave} className="btn-metallic-gold px-5 py-2 rounded-lg text-sm font-bold">Save</button>
                                            <button onClick={() => setShowShopItemForm(false)} className="px-5 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-yellow-900/30 hover:border-yellow-900/50 transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {shopInventory.map(item => (
                                        <div key={item.id} className="bg-brand-navy/60 border border-yellow-900/30 rounded-xl overflow-hidden hover:border-brand-gold/40 transition-colors">
                                            <div className="h-32 bg-brand-dark/50 relative overflow-hidden">
                                                {item.imageUrl
                                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">🖼️</div>}
                                                <span className="absolute top-2 right-2 bg-brand-gold text-brand-dark text-[10px] font-black px-2 py-0.5 rounded-full">{item.source.replace('-', ' ').toUpperCase()}</span>
                                            </div>
                                            <div className="p-4">
                                                <h4 className="font-bold text-white">{item.name}</h4>
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.collection}</p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-brand-gold font-semibold text-sm">${item.price.toLocaleString()}</span>
                                                    <span className="text-gray-500 text-xs">{item.chain}</span>
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => { setShopItemForm({ name: item.name, collection: item.collection, imageUrl: item.imageUrl, category: item.category || 'Art', chain: item.chain || 'Ethereum', price: item.price }); setEditingShopItem(item.id); setShowShopItemForm(true); }}
                                                        className="flex-1 text-xs py-1.5 rounded border border-yellow-900/40 text-gray-300 hover:text-brand-gold hover:border-brand-gold/40 transition-colors">Edit</button>
                                                    <button onClick={() => setConfirmDelete({ type: 'shopItem', id: item.id, label: item.name })}
                                                        className="flex-1 text-xs py-1.5 rounded border border-red-900/40 text-red-500 hover:bg-red-900/20 transition-colors">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {shopInventory.length === 0 && (
                                        <div className="col-span-3 text-center py-12 text-gray-500">No items on the shop floor yet. Add one above, or list a liquidated loan.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Delete Confirm Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-brand-navy border border-red-900/40 rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-white mb-2">Confirm Delete</h3>
                        <p className="text-gray-400 mb-6">Are you sure you want to permanently delete <strong className="text-white">{confirmDelete.label}</strong>? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={handleDeleteConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-colors">Delete</button>
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-brand-dark border border-yellow-900/40 text-gray-300 font-bold py-2 rounded-lg hover:text-white transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default AdminPage;
