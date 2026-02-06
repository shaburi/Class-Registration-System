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
        if (percent >= 100) return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
        if (percent >= 80) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
        if (percent >= 50) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]';
        return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
    };

    if (loading) {
        return (
            <div className="glass-card rounded-3xl p-6 h-full animate-pulse bg-white/40 dark:bg-white/5">
                <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-48 mb-4"></div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-100 dark:bg-white/5 rounded-xl"></div>
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
                    <Users className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                    Live Seat Availability
                </h3>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all hover:scale-105 active:scale-95 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-6 space-y-3 flex-1 overflow-y-auto custom-scrollbar bg-white/40 dark:bg-black/20">
                {sections.map((section, index) => {
                    const percent = Math.round((section.enrolled_count / section.capacity) * 100);
                    const isFull = section.enrolled_count >= section.capacity;

                    return (
                        <motion.div
                            key={section.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative overflow-hidden bg-gray-50/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/20 rounded-2xl p-3 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between mb-2 relative z-10">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                                            {section.subject_code}
                                        </span>
                                        <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-white/20"></div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-white/50 truncate max-w-[120px]">
                                            {section.subject_name || 'Subject'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-white/40 font-bold uppercase tracking-wider border border-gray-200 dark:border-white/5">
                                            Sec {section.section_number}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-white/30">
                                            {section.day.slice(0, 3)} {section.start_time?.slice(0, 5)}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                        <span className={`text-sm font-bold ${isFull ? 'text-rose-400' : percent >= 80 ? 'text-amber-400' : 'text-emerald-400'} drop-shadow-sm`}>
                                            {percent}%
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 dark:text-white/30 font-medium">
                                        {section.enrolled_count}/{section.capacity} seats
                                    </span>
                                </div>
                            </div>

                            {/* Sleek Glossy Progress bar */}
                            <div className="h-1.5 bg-gray-200 dark:bg-black/40 rounded-full overflow-hidden relative z-10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(percent, 100)}%` }}
                                    transition={{ duration: 1, ease: "circOut", delay: index * 0.05 }}
                                    className={`h-full rounded-full relative overflow-hidden ${getStatusColor(section.enrolled_count, section.capacity)}`}
                                >
                                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/50"></div>
                                </motion.div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="px-6 pb-4 bg-white/40 dark:bg-black/20">
                <p className="text-[10px] font-medium text-gray-400 dark:text-white/20 text-center uppercase tracking-widest">
                    Updates live every 30s
                </p>
            </div>
        </motion.div>
    );
}
