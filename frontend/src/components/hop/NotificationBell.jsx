import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';


const NotificationBell = ({ notifications, onNotificationClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { accent } = useTheme();

    // Ensure notifications is always an array (handles undefined, null, objects, etc.)
    const notificationsList = Array.isArray(notifications) ? notifications : [];
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

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
                <Bell size={20} className="text-white/70 group-hover:text-white transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-xs font-bold rounded-full border-2 border-[var(--bg-primary)]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-3 w-80 sm:w-96 max-h-[80vh] flex flex-col glass-card rounded-2xl shadow-xl overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
                            {notificationsList.length === 0 ? (
                                <div className="text-center py-8 text-white/30">
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
                                            relative p-3 rounded-xl border cursor-pointer group transition-all
                                            ${notification.read
                                                ? 'bg-transparent border-transparent hover:bg-white/5'
                                                : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                                            }
                                        `}
                                    >
                                        {!notification.read && (
                                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                        )}

                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 p-2 rounded-lg h-fit ${notification.read ? 'bg-white/5' : 'bg-white/10'}`}>
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-medium leading-tight mb-1 ${notification.read ? 'text-white/70' : 'text-white'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <div className="mt-2 text-[10px] text-white/30 font-mono">
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
