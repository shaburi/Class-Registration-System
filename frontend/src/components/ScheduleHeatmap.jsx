import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users } from 'lucide-react';
import api from '../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

// Color scale from green (low) to red (high)
const getHeatColor = (intensity) => {
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (intensity < 0.25) return 'bg-green-200 dark:bg-green-900/50';
    if (intensity < 0.5) return 'bg-yellow-200 dark:bg-yellow-900/50';
    if (intensity < 0.75) return 'bg-orange-300 dark:bg-orange-900/50';
    return 'bg-red-400 dark:bg-red-900/60';
};

export default function ScheduleHeatmap() {
    const [heatmapData, setHeatmapData] = useState({});
    const [loading, setLoading] = useState(true);
    const [maxCount, setMaxCount] = useState(1);

    useEffect(() => {
        loadHeatmapData();
    }, []);

    const loadHeatmapData = async () => {
        try {
            const response = await api.get('/hop/schedule-heatmap');
            const data = response.data.data || {};
            setHeatmapData(data.heatmap || {});
            setMaxCount(data.maxCount || 1);
        } catch (error) {
            console.error('Failed to load heatmap:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIntensity = (day, hour) => {
        const key = `${day}-${hour}`;
        const count = heatmapData[key] || 0;
        return count / maxCount;
    };

    const getCount = (day, hour) => {
        const key = `${day}-${hour}`;
        return heatmapData[key] || 0;
    };

    // Premium Color Scale (Indigo/Purple/Pink) - Glassmorphic
    const getHeatColor = (intensity) => {
        if (intensity === 0) return 'bg-gray-100/50 dark:bg-white/5 border border-gray-200 dark:border-white/5';
        if (intensity < 0.25) return 'bg-blue-500/20 border border-blue-500/20';
        if (intensity < 0.5) return 'bg-blue-500/40 border border-blue-500/30 shadow-[0_0_8px_rgba(99,102,241,0.2)]';
        if (intensity < 0.75) return 'bg-red-500/60 border border-red-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]';
        return 'bg-rose-500/80 border border-rose-500/50 shadow-[0_0_15px_rgba(236,72,153,0.4)]';
    };

    if (loading) {
        return (
            <div className="glass-card rounded-3xl p-6 h-full animate-pulse bg-white/40 dark:bg-white/5">
                <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-48 mb-6"></div>
                <div className="h-64 bg-gray-100 dark:bg-white/5 rounded-xl"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-1 overflow-hidden h-full"
        >
            <div className="bg-gray-50/50 dark:bg-white/5 p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        Schedule Density
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-white/40">Class frequency heatmap</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-white/50 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                    <span>Less</span>
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10"></div>
                        <div className="w-3 h-3 rounded-sm bg-blue-500/40 border border-blue-500/30"></div>
                        <div className="w-3 h-3 rounded-sm bg-red-500/60 border border-red-500/40"></div>
                        <div className="w-3 h-3 rounded-sm bg-rose-500/80 border border-rose-500/50"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>

            <div className="p-6 overflow-x-auto custom-scrollbar bg-white/40 dark:bg-black/20">
                <table className="w-full border-separate border-spacing-1.5">
                    <thead>
                        <tr>
                            <th className="p-2 text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest text-left">Day</th>
                            {HOURS.map(hour => (
                                <th key={hour} className="p-1 text-[10px] font-bold text-gray-400 dark:text-white/30 text-center">
                                    {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map(day => (
                            <tr key={day} className="group/row">
                                <td className="p-2 text-xs font-bold text-gray-500 dark:text-white/60 rounded-lg group-hover/row:text-gray-900 dark:group-hover/row:text-white transition-colors">
                                    {day.slice(0, 3)}
                                </td>
                                {HOURS.map(hour => {
                                    const intensity = getIntensity(day, hour);
                                    const count = getCount(day, hour);
                                    return (
                                        <td key={hour}>
                                            <motion.div
                                                whileHover={{ scale: 1.15, zIndex: 10 }}
                                                className={`w-full h-10 rounded-lg ${getHeatColor(intensity)} flex items-center justify-center cursor-default group relative transition-all duration-300 backdrop-blur-sm`}
                                            >
                                                {count > 0 && (
                                                    <span className={`text-[10px] font-bold ${intensity > 0.5 ? 'text-white' : 'text-white/80'} drop-shadow-md`}>
                                                        {count}
                                                    </span>
                                                )}

                                                {/* Sophisticated Tooltip */}
                                                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                                    <div className="bg-white/90 dark:bg-black/80 text-gray-900 dark:text-white text-xs py-2 px-3 rounded-xl shadow-xl whitespace-nowrap flex flex-col items-center border border-gray-200 dark:border-white/10 backdrop-blur-xl">
                                                        <span className="font-bold text-blue-600 dark:text-blue-300">{count} Sections</span>
                                                        <span className="text-gray-500 dark:text-white/50 text-[10px]">{day} • {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
