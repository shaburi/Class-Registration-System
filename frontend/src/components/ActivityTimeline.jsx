import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, UserPlus, UserMinus, ArrowRightLeft, Clock, RefreshCw } from 'lucide-react';
import api from '../services/api';

const getActivityIcon = (type) => {
    switch (type) {
        case 'registration':
            return <UserPlus className="w-4 h-4 text-green-500" />;
        case 'drop':
            return <UserMinus className="w-4 h-4 text-red-500" />;
        case 'swap':
            return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
        default:
            return <Activity className="w-4 h-4 text-gray-500" />;
    }
};

const getActivityBg = (type) => {
    switch (type) {
        case 'registration':
            return 'bg-green-100 dark:bg-green-900/30';
        case 'drop':
            return 'bg-red-100 dark:bg-red-900/30';
        case 'swap':
            return 'bg-blue-100 dark:bg-blue-900/30';
        default:
            return 'bg-gray-100 dark:bg-gray-700';
    }
};

const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

export default function ActivityTimeline() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadActivities();
        // Refresh every 60 seconds
        const interval = setInterval(loadActivities, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadActivities = async () => {
        try {
            const response = await api.get('/hop/activity-log');
            setActivities(response.data.data || []);
        } catch (error) {
            console.error('Failed to load activities:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadActivities();
    };

    // Premium Glass Modifiers
    const getActivityStyle = (type) => {
        switch (type) {
            case 'registration':
                return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            case 'drop':
                return 'bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
            case 'swap':
                return 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]';
            default:
                return 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60';
        }
    };

    if (loading) {
        return (
            <div className="glass-card rounded-3xl p-6 h-full animate-pulse bg-white/40 dark:bg-white/5">
                <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-48 mb-4"></div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-xl"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-1 overflow-hidden h-full flex flex-col"
        >
            <div className="bg-gray-50/50 dark:bg-white/5 p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    Student Activity
                </h3>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all hover:scale-105 active:scale-95 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {activities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400 dark:text-white/40 bg-white/40 dark:bg-black/20">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-white/5">
                        <Activity className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium">No recent activity</p>
                    <p className="text-sm opacity-60">New registrations will appear here</p>
                </div>
            ) : (
                <div className="flex-1 relative pl-6 space-y-6 overflow-y-auto pr-4 custom-scrollbar bg-white/40 dark:bg-black/20 p-6">
                    {/* Vertical Connectivity Line */}
                    <div className="absolute left-[39px] top-6 bottom-6 w-[1px] bg-gray-300 dark:bg-white/10 rounded-full"></div>

                    <AnimatePresence>
                        {activities.map((activity, index) => (
                            <motion.div
                                key={activity.id || index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative flex items-start gap-4 group"
                            >
                                {/* Icon Bubble */}
                                <div className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-xl backdrop-blur-md transition-transform group-hover:scale-110 ${getActivityStyle(activity.type)}`}>
                                    {getActivityIcon(activity.type)}
                                </div>

                                <div className="flex-1 min-w-0 bg-gray-50/80 dark:bg-white/5 rounded-2xl p-4 hover:bg-white dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-black/20">
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <p className="text-sm text-gray-800 dark:text-white/90 line-clamp-2 leading-relaxed">
                                            <span className="font-bold text-gray-900 dark:text-white">{activity.student_name || 'Student'}</span>
                                            <span className="opacity-60 mx-1">
                                                {activity.type === 'registration' && 'registered for'}
                                                {activity.type === 'drop' && 'dropped'}
                                                {activity.type === 'swap' && 'swapped to'}
                                            </span>
                                            <span className={`font-bold px-1.5 py-0.5 rounded text-xs inline-block border ${activity.type === 'registration' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300' :
                                                activity.type === 'drop' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300' :
                                                    'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-300'
                                                }`}>
                                                {activity.subject_code}
                                            </span>
                                            {activity.section_number && <span className="text-xs text-gray-500 dark:text-white/40 ml-1 font-mono tracking-tight">(Sec {activity.section_number})</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-white/30 font-medium uppercase tracking-wider mt-2">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatTimeAgo(activity.created_at)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
}
