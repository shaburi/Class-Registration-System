import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';


const NotificationBell = ({ notifications, onNotificationClick, onClearAll }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [cleared, setCleared] = useState(false);
    const dropdownRef = useRef(null);
    const { accent } = useTheme();

    // Reset cleared state if notifications change size drastically
    useEffect(() => {
        if (notifications?.length > 0) {
            setCleared(false);
        }
    }, [notifications?.length]);

    // Ensure notifications is always an array (handles undefined, null, objects, etc.)
    const notificationsList = Array.isArray(notifications) && !cleared ? notifications : [];
    const unreadCount = notificationsList.filter(n => !n.read).length;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} className="text-emerald-400" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-400" />;
            case 'error': return <X size={16} className="text-rose-400" />;
            default: return <Info size={16} className="text-blue-400" />;
        }
    };

    const handleClearAll = (e) => {
        e.stopPropagation();
        setCleared(true);
        if (onClearAll) onClearAll();
        // setIsOpen(false); // optional, let's keep it open to show "No notifications"
    };

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-3 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:hover:bg-white/10 transition-all group"
            >
                <Bell size={20} className="text-gray-500 hover:text-gray-800 dark:text-white/70 dark:group-hover:text-white transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-xs font-bold rounded-full border-2 border-white dark:border-[var(--bg-primary)] shadow-sm">
                        {unreadCount > 10 ? '10+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-3 w-80 sm:w-96 max-h-[80vh] flex flex-col bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-card"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <span className="text-xs text-blue-600 bg-blue-100 dark:text-white/50 dark:bg-white/10 px-2 py-1 rounded-full font-medium">
                                        {unreadCount} unread
                                    </span>
                                )}
                                {notificationsList.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2 relative z-10 bg-white/50 dark:bg-transparent">
                            {notificationsList.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 dark:text-white/30">
                                    <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No notifications</p>
                                </div>
                            ) : (
                                notificationsList.map((notification) => (
                                    <motion.div
                                        key={notification.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => {
                                            onNotificationClick && onNotificationClick(notification);
                                            setIsOpen(false);
                                        }}
                                        className={`
                                            relative p-3 rounded-xl border border-transparent cursor-pointer group transition-all
                                            ${notification.read
                                                ? 'hover:bg-gray-50 dark:hover:bg-white/5'
                                                : 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/20'
                                            }
                                        `}
                                    >
                                        {!notification.read && (
                                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)] dark:shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                        )}

                                        <div className="flex gap-3 relative z-10">
                                            <div className={`mt-0.5 p-2 rounded-lg h-fit flex-shrink-0 ${notification.read ? 'bg-gray-100 dark:bg-white/5' : 'bg-blue-100 dark:bg-white/10'}`}>
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-semibold leading-tight mb-1 ${notification.read ? 'text-gray-600 dark:text-white/70' : 'text-gray-900 dark:text-white'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-white/50 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <div className="mt-2 text-[10px] text-gray-400 dark:text-white/30 font-mono font-medium">
                                                    {notification.time || 'Just now'}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
