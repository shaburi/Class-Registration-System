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

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow h-full"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    Student Activity
                </h3>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Activity className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-medium">No recent activity</p>
                    <p className="text-sm opacity-60">New registrations will appear here</p>
                </div>
            ) : (
                <div className="relative pl-4 space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Vertical Connectivity Line */}
                    <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-gray-200 dark:bg-gray-700 rounded-full"></div>

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
                                <div className={`relative z-10 p-2 rounded-xl shadow-sm border-2 border-white dark:border-gray-800 ${getActivityBg(activity.type)} transition-transform group-hover:scale-110`}>
                                    {getActivityIcon(activity.type)}
                                </div>

                                <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                                            <span className="font-bold text-gray-900 dark:text-white">{activity.student_name || 'Student'}</span>
                                            <span className="opacity-80">
                                                {activity.type === 'registration' && ' registered for '}
                                                {activity.type === 'drop' && ' dropped '}
                                                {activity.type === 'swap' && ' swapped to '}
                                            </span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 rounded text-xs ml-1 inline-block border border-indigo-100 dark:border-indigo-800/50">
                                                {activity.subject_code}
                                            </span>
                                            {activity.section_number && <span className="text-xs text-gray-500 ml-1">(Sec {activity.section_number})</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span className="font-medium">{formatTimeAgo(activity.created_at)}</span>
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
