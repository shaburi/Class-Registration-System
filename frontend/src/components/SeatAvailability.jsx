import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../services/api';

export default function SeatAvailability({ onRefresh }) {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadSections();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadSections, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadSections = async () => {
        try {
            const response = await api.get('/hop/sections');
            const data = response.data.data || [];
            // Sort by fill percentage (most full first)
            const sorted = data.sort((a, b) => {
                const aPercent = a.enrolled_count / a.capacity;
                const bPercent = b.enrolled_count / b.capacity;
                return bPercent - aPercent;
            });
            setSections(sorted.slice(0, 8)); // Top 8
        } catch (error) {
            console.error('Failed to load sections:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadSections();
        if (onRefresh) onRefresh();
    };

    const getStatusColor = (enrolled, capacity) => {
        const percent = (enrolled / capacity) * 100;
        if (percent >= 100) return 'bg-red-500';
        if (percent >= 80) return 'bg-orange-500';
        if (percent >= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStatusBg = (enrolled, capacity) => {
        const percent = (enrolled / capacity) * 100;
        if (percent >= 100) return 'bg-red-100 dark:bg-red-900/20';
        if (percent >= 80) return 'bg-orange-100 dark:bg-orange-900/20';
        if (percent >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20';
        return 'bg-green-100 dark:bg-green-900/20';
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
                    <Users className="w-5 h-5 text-cyan-500" />
                    Live Seat Availability
                </h3>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-4">
                {sections.map((section, index) => {
                    const percent = Math.round((section.enrolled_count / section.capacity) * 100);
                    const isFull = section.enrolled_count >= section.capacity;

                    return (
                        <motion.div
                            key={section.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                            {section.subject_code}
                                        </span>
                                        <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                                            {section.subject_name || 'Subject'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium border border-gray-200 dark:border-gray-600">
                                            Sec {section.section_number}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {section.day.slice(0, 3)} {section.start_time?.slice(0, 5)}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                        <span className={`text-sm font-bold ${isFull ? 'text-rose-500' : percent >= 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {percent}%
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {section.enrolled_count}/{section.capacity} seats
                                    </span>
                                </div>
                            </div>

                            {/* Sleek Glossy Progress bar */}
                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(percent, 100)}%` }}
                                    transition={{ duration: 1, ease: "circOut", delay: index * 0.05 }}
                                    className={`h-full rounded-full relative overflow-hidden ${getStatusColor(section.enrolled_count, section.capacity)}`}
                                >
                                    {/* Gloss effect */}
                                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40"></div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-black/5"></div>
                                </motion.div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <p className="text-[10px] font-medium text-gray-400/80 dark:text-gray-500/80 mt-6 text-center uppercase tracking-widest">
                Updates live every 30s
            </p>
        </motion.div>
    );
}
