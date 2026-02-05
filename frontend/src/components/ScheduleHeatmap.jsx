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

    // Premium Color Scale (Indigo/Purple/Pink)
    const getHeatColor = (intensity) => {
        if (intensity === 0) return 'bg-gray-100 dark:bg-gray-700/30'; // Increased contrast for empty cells
        if (intensity < 0.25) return 'bg-indigo-100 dark:bg-indigo-900/60'; // Darker background for low intensity
        if (intensity < 0.5) return 'bg-indigo-300 dark:bg-indigo-700/80';
        if (intensity < 0.75) return 'bg-purple-400 dark:bg-purple-600';
        return 'bg-pink-500 dark:bg-pink-500 shadow-lg shadow-pink-500/30';
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
                    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        Schedule Density
                    </h3>
                    <p className="text-sm text-gray-400">Class frequency heatmap</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-700/30 px-3 py-1.5 rounded-full">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-indigo-100 dark:bg-indigo-900/30"></div>
                        <div className="w-3 h-3 rounded-sm bg-indigo-300 dark:bg-indigo-700/50"></div>
                        <div className="w-3 h-3 rounded-sm bg-purple-400 dark:bg-purple-600/70"></div>
                        <div className="w-3 h-3 rounded-sm bg-pink-500 dark:bg-pink-500"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>

            <div className="overflow-x-auto pb-2">
                <table className="w-full border-separate border-spacing-1">
                    <thead>
                        <tr>
                            <th className="p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">Day</th>
                            {HOURS.map(hour => (
                                <th key={hour} className="p-1 text-xs font-semibold text-gray-400 text-center">
                                    {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map(day => (
                            <tr key={day} className="group/row">
                                <td className="p-2 text-xs font-bold text-gray-600 dark:text-gray-300 rounded-lg group-hover/row:bg-gray-50 dark:group-hover/row:bg-gray-700/30 transition-colors">
                                    {day.slice(0, 3)}
                                </td>
                                {HOURS.map(hour => {
                                    const intensity = getIntensity(day, hour);
                                    const count = getCount(day, hour);
                                    return (
                                        <td key={hour}>
                                            <motion.div
                                                whileHover={{ scale: 1.15, zIndex: 10 }}
                                                className={`w-full h-10 rounded-lg ${getHeatColor(intensity)} flex items-center justify-center cursor-default group relative transition-all duration-300`}
                                            >
                                                {count > 0 && (
                                                    <span className={`text-[10px] font-bold ${intensity > 0.5 ? 'text-white' : 'text-indigo-900 dark:text-indigo-100'} opacity-90`}>
                                                        {count}
                                                    </span>
                                                )}

                                                {/* Sophisticated Tooltip */}
                                                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                                    <div className="bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap flex flex-col items-center">
                                                        <span className="font-bold">{count} Sections</span>
                                                        <span className="text-gray-400 text-[10px]">{day} • {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}</span>
                                                        {/* Arrow */}
                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
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
