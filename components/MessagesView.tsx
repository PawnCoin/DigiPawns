import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import type { Message } from '../types';

const MessagesView: React.FC = () => {
    const { userId, profile, friends, messages, sendMessage, markConversationRead } = useAppContext();
    const [selectedUid, setSelectedUid] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const getConversationId = (a: string, b: string) => [a, b].sort().join('_');

    const getConversationMessages = (otherUid: string): Message[] => {
        if (!userId) return [];
        const convId = getConversationId(userId, otherUid);
        return messages
            .filter(m => m.conversationId === convId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    };

    const getUnreadCount = (otherUid: string): number => {
        if (!userId) return 0;
        const convId = getConversationId(userId, otherUid);
        return messages.filter(m => m.conversationId === convId && m.toUid === userId && !m.read).length;
    };

    const selectedFriend = friends.find(f => f.uid === selectedUid);
    const convMessages = selectedUid ? getConversationMessages(selectedUid) : [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [convMessages.length]);

    useEffect(() => {
        if (selectedUid && userId) {
            const convId = getConversationId(userId, selectedUid);
            markConversationRead(convId);
        }
    }, [selectedUid, convMessages.length]);

    const handleSend = async () => {
        if (!text.trim() || !selectedUid || !selectedFriend || sending) return;
        setSending(true);
        await sendMessage(selectedUid, selectedFriend.username, text.trim());
        setText('');
        setSending(false);
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return isToday
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex h-[600px] bg-brand-dark/30 border border-yellow-900/30 rounded-xl overflow-hidden">
            {/* Sidebar: friend list */}
            <div className="w-64 flex-shrink-0 border-r border-yellow-900/30 flex flex-col">
                <div className="px-4 py-3 border-b border-yellow-900/30">
                    <h3 className="font-bold text-white text-sm">Messages</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {friends.length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm mt-4">
                            Add friends first to start messaging.
                        </div>
                    )}
                    {friends.map(friend => {
                        const unread = getUnreadCount(friend.uid);
                        const convMsgs = getConversationMessages(friend.uid);
                        const lastMsg = convMsgs[convMsgs.length - 1];
                        return (
                            <button
                                key={friend.uid}
                                onClick={() => setSelectedUid(friend.uid)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-navy/50 ${selectedUid === friend.uid ? 'bg-brand-navy/60 border-r-2 border-brand-gold' : ''}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-9 h-9 rounded-full bg-brand-navy border border-yellow-900/40 overflow-hidden">
                                        {friend.avatarNftUrl
                                            ? <img src={friend.avatarNftUrl} alt="" className="w-full h-full object-cover" />
                                            : <span className="w-full h-full flex items-center justify-center text-brand-gold text-sm font-bold">{friend.username?.[0]?.toUpperCase()}</span>}
                                    </div>
                                    {unread > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{unread}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-semibold truncate">{friend.username}</p>
                                    {lastMsg && (
                                        <p className="text-gray-500 text-xs truncate">
                                            {lastMsg.fromUid === userId ? 'You: ' : ''}{lastMsg.text}
                                        </p>
                                    )}
                                </div>
                                {lastMsg && <span className="text-gray-600 text-[10px] flex-shrink-0">{formatTime(lastMsg.timestamp)}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
                {selectedFriend ? (
                    <>
                        {/* Chat header */}
                        <div className="px-5 py-3 border-b border-yellow-900/30 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-navy border border-yellow-900/40 overflow-hidden flex-shrink-0">
                                {selectedFriend.avatarNftUrl
                                    ? <img src={selectedFriend.avatarNftUrl} alt="" className="w-full h-full object-cover" />
                                    : <span className="w-full h-full flex items-center justify-center text-brand-gold text-sm font-bold">{selectedFriend.username?.[0]?.toUpperCase()}</span>}
                            </div>
                            <span className="font-bold text-white">{selectedFriend.username}</span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                            {convMessages.length === 0 && (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500 text-sm">No messages yet. Say hello!</p>
                                </div>
                            )}
                            {convMessages.map(msg => {
                                const isMine = msg.fromUid === userId;
                                return (
                                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isMine
                                            ? 'bg-brand-gold text-brand-dark font-medium rounded-br-none'
                                            : 'bg-brand-navy border border-yellow-900/30 text-gray-200 rounded-bl-none'}`}>
                                            <p>{msg.text}</p>
                                            <p className={`text-[10px] mt-1 ${isMine ? 'text-brand-dark/60 text-right' : 'text-gray-500'}`}>{formatTime(msg.timestamp)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="px-4 py-3 border-t border-yellow-900/30 flex gap-2">
                            <input
                                type="text"
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                placeholder="Type a message…"
                                className="flex-1 bg-brand-dark border border-yellow-900/40 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-gold/40"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!text.trim() || sending}
                                className="btn-metallic-gold px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:[animation:none]"
                            >
                                Send
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="text-5xl mb-4">💬</div>
                        <h3 className="text-white font-bold text-lg mb-2">Your Messages</h3>
                        <p className="text-gray-500 text-sm max-w-xs">Select a friend from the left to start a conversation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesView;
