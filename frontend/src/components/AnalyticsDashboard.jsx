import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Users, BookOpen, Activity, Calendar, MoreHorizontal } from 'lucide-react';
import api from '../services/api';
import ScheduleHeatmap from './ScheduleHeatmap';
import SeatAvailability from './SeatAvailability';
import ActivityTimeline from './ActivityTimeline';

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = parseInt(value);
        if (start === end) return;

        const incrementTime = duration / end;
        const timer = setInterval(() => {
            start += 1;
            setCount(start);
            if (start === end) clearInterval(timer);
        }, Math.max(incrementTime, 10));

        return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{count}</span>;
};

// Premium Chart Colors
const CHART_COLORS = {
    primary: '#6366f1', // Indigo
    secondary: '#06b6d4', // Cyan
    tertiary: '#10b981', // Emerald
    quaternary: '#f59e0b', // Amber
    gradient: [
        '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
        '#f43f5e', '#f97316', '#f59e0b', '#10b981'
    ],
    enrollmentGradient: {
        id: 'colorEnrollment',
        start: '#6366f1',
        end: '#8b5cf6'
    }
};

const UTILIZATION_COLORS = {
    full: '#f43f5e', // Rose
    moderate: '#f59e0b', // Amber
    low: '#10b981' // Emerald
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 ring-1 ring-black/5">
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: <span className="font-bold">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function AnalyticsDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const response = await api.get('/hop/analytics');
            setAnalytics(response.data.data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        // ... loading skeleton (kept simple for brevity as it's fine)
        return (
            <div className="space-y-6">
                {/* Loading skeletons */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
                    ))}
                </div>
                <div className="h-96 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!analytics) return null;

    const { utilizationStats, sectionStats, subjectPopularity, enrollmentTrend, dayActivity, utilizationBreakdown } = analytics;

    // Prepare pie chart data
    const sectionPieData = [
        { name: 'Full', value: sectionStats.full, color: UTILIZATION_COLORS.full },
        { name: 'Available', value: sectionStats.available, color: UTILIZATION_COLORS.low }
    ];

    const utilizationPieData = utilizationBreakdown?.map(item => ({
        name: item.category === 'full' ? 'High (>90%)' : item.category === 'moderate' ? 'Mod (50-90%)' : 'Low (<50%)',
        value: item.count,
        color: UTILIZATION_COLORS[item.category]
    })) || [];

    const statsCards = [
        {
            title: 'Total Enrollment',
            value: utilizationStats.currentEnrollment,
            subtext: 'active students',
            icon: Users,
            gradient: "from-indigo-500 to-purple-600",
            shadow: "shadow-indigo-200 dark:shadow-indigo-900/20"
        },
        {
            title: 'Total Sections',
            value: sectionStats.total,
            subtext: `${sectionStats.full} full • ${sectionStats.available} open`,
            icon: BookOpen,
            gradient: "from-cyan-500 to-blue-600",
            shadow: "shadow-cyan-200 dark:shadow-cyan-900/20"
        },
        {
            title: 'Capacity Used',
            value: `${utilizationStats.utilization}%`,
            subtext: `${utilizationStats.currentEnrollment}/${utilizationStats.totalCapacity} seats`,
            icon: Activity,
            gradient: "from-emerald-500 to-teal-600",
            shadow: "shadow-emerald-200 dark:shadow-emerald-900/20"
        },
        {
            title: 'Available Seats',
            value: utilizationStats.totalCapacity - utilizationStats.currentEnrollment,
            subtext: 'across all sections',
            icon: TrendingUp,
            gradient: "from-amber-500 to-orange-600",
            shadow: "shadow-amber-200 dark:shadow-amber-900/20"
        },
    ];

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 dark:from-white dark:via-purple-200 dark:to-white">
                    Analytics Overview
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time insights into scheduling performance</p>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {statsCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} hover:scale-[1.02] transition-transform duration-300`}
                    >
                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-black/5 rounded-full blur-xl" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="p-1 bg-white/10 rounded-full cursor-pointer hover:bg-white/20 transition-colors">
                                    <MoreHorizontal className="w-4 h-4 text-white/70" />
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-white/80 mb-1">{stat.title}</h3>
                            <div className="text-3xl font-bold tracking-tight mb-1">
                                {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                            </div>
                            <p className="text-xs text-white/60 font-medium">{stat.subtext}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Charts Section - Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Enrollment Trend - Takes up 2 columns */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                Enrollment Growth
                            </h3>
                            <p className="text-sm text-gray-400">Daily registration activity</p>
                        </div>
                        <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-full">
                            Last 7 Days
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={enrollmentTrend}>
                                <defs>
                                    <linearGradient id="colorEnrollment" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#9ca3af"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12 }}
                                    dx={-10}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke={CHART_COLORS.primary}
                                    strokeWidth={3}
                                    fill="url(#colorEnrollment)"
                                    animationDuration={2000}
                                    name="Registrations"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Section Status - 1 Column */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 dark:bg-gray-700/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2 relative z-10">Section Status</h3>
                    <p className="text-sm text-gray-400 mb-6 relative z-10">Ratio of full to available sections</p>

                    <div className="h-[250px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sectionPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={6}
                                >
                                    {sectionPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-sm font-medium text-gray-600 dark:text-gray-300 ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none -mt-4">
                            <p className="text-3xl font-bold text-gray-800 dark:text-white">{sectionStats.total}</p>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Subject Popularity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow"
                >
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-6">Subject Popularity</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectPopularity} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="code"
                                    type="category"
                                    width={70}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fontWeight: 600, fill: '#6b7280' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    content={<CustomTooltip />}
                                />
                                <Bar dataKey="students" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1500}>
                                    {subjectPopularity.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Day Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow"
                >
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-6">Activity by Day</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dayActivity}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                                    content={<CustomTooltip />}
                                />
                                <Bar
                                    dataKey="count"
                                    fill={CHART_COLORS.quaternary}
                                    radius={[8, 8, 8, 8]}
                                    name="Registrations"
                                    barSize={24}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Capacity Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow"
                >
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">Capacity Health</h3>
                    <p className="text-sm text-gray-400 mb-4">Utilization distribution</p>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={utilizationPieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    cornerRadius={4}
                                >
                                    {utilizationPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-xs font-medium text-gray-500 ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Row 3 - Heatmap takes 2/3, Seat Availability 1/3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="lg:col-span-2"
                >
                    <ScheduleHeatmap />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                >
                    <SeatAvailability />
                </motion.div>
            </div>

            {/* Row 4 - Activity Timeline in the middle, or full width if preferred */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="hidden lg:block">
                    {/* Spacer or another widget could go here in future */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white h-full shadow-lg relative overflow-hidden flex flex-col justify-center items-center text-center">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <Calendar className="w-16 h-16 mb-4 text-white/80" />
                        <h3 className="text-xl font-bold mb-2">Academic Calendar</h3>
                        <p className="text-white/80 text-sm">Fall 2024 Semester</p>
                        <button className="mt-6 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-bold transition-colors">
                            View Full Calendar
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <ActivityTimeline />
                </div>
            </div>
        </div>
    );
}
