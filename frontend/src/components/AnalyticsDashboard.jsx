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
    primary: '#3b82f6', // Blue
    secondary: '#ef4444', // Red
    tertiary: '#10b981', // Emerald
    quaternary: '#f59e0b', // Amber
    gradient: [
        '#3b82f6', '#8b5cf6', '#d946ef', '#ef4444',
        '#f43f5e', '#f97316', '#f59e0b', '#10b981'
    ],
    enrollmentGradient: {
        id: 'colorEnrollment',
        start: '#3b82f6',
        end: '#ef4444'
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
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-40 glass-card rounded-2xl animate-pulse bg-white/5" />
                    ))}
                </div>
                <div className="h-96 glass-card rounded-2xl animate-pulse bg-white/5" />
            </div>
        );
    }

    if (!analytics) return null;

    const { utilizationStats, sectionStats, subjectPopularity, enrollmentTrend, dayActivity, utilizationBreakdown } = analytics;

    // Define Neon Colors
    const NEON_COLORS = {
        primary: '#3b82f6', // Blue
        secondary: '#ef4444', // Red
        tertiary: '#10b981', // Emerald
        quaternary: '#f59e0b', // Amber
        pink: '#f43f5e', // Rose
    };

    const sectionPieData = [
        { name: 'Full', value: sectionStats.full, color: '#f43f5e' }, // Rose
        { name: 'Available', value: sectionStats.available, color: '#10b981' } // Emerald
    ];

    const utilizationPieData = utilizationBreakdown?.map(item => ({
        name: item.category === 'full' ? 'High (>90%)' : item.category === 'moderate' ? 'Mod (50-90%)' : 'Low (<50%)',
        value: item.count,
        color: item.category === 'full' ? '#f43f5e' : item.category === 'moderate' ? '#f59e0b' : '#10b981'
    })) || [];

    const statsCards = [
        {
            title: 'Total Enrollment',
            value: utilizationStats.currentEnrollment,
            subtext: 'active students',
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            glow: "shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        },
        {
            title: 'Total Sections',
            value: sectionStats.total,
            subtext: `${sectionStats.full} full • ${sectionStats.available} open`,
            icon: BookOpen,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/20",
            glow: "shadow-[0_0_20px_rgba(6,182,212,0.2)]"
        },
        {
            title: 'Capacity Used',
            value: `${utilizationStats.utilization}%`,
            subtext: `${utilizationStats.currentEnrollment}/${utilizationStats.totalCapacity} seats`,
            icon: Activity,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            glow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        },
        {
            title: 'Available Seats',
            value: utilizationStats.totalCapacity - utilizationStats.currentEnrollment,
            subtext: 'across all sections',
            icon: TrendingUp,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        },
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="relative">
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-600 to-gray-900 dark:from-white dark:via-red-200 dark:to-white relative z-10">
                    Analytics Overview
                </h2>
                <p className="text-gray-600 dark:text-white/60 mt-2 relative z-10">Real-time scheduling performance and capacity insights.</p>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`glass-card p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${stat.glow}`}
                    >
                        {/* Radial Gradient Background */}
                        <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 transition-opacity duration-300 group-hover:opacity-40 ${stat.bg.replace('/10', '')} dark:opacity-20`} />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.border} border backdrop-blur-md`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-white/50">{stat.title}</h3>
                                <div className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-white/40 font-medium tracking-wide">{stat.subtext}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Enrollment Trend */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 glass-card rounded-3xl p-1 overflow-hidden"
                >
                    <div className="bg-gray-50/50 dark:bg-white/5 p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">Enrollment Growth</h3>
                            <p className="text-xs text-gray-500 dark:text-white/40">Daily registration activity</p>
                        </div>
                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-full">
                            Last 7 Days
                        </div>
                    </div>
                    <div className="p-6 h-[320px] w-full bg-white/40 dark:bg-black/20">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={enrollmentTrend}>
                                <defs>
                                    <linearGradient id="colorEnrollment" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={NEON_COLORS.primary} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={NEON_COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--text-secondary)"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="var(--text-secondary)"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                    dx={-10}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: NEON_COLORS.primary, strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke={NEON_COLORS.primary}
                                    strokeWidth={3}
                                    fill="url(#colorEnrollment)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Section Status */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card rounded-3xl p-1 overflow-hidden flex flex-col"
                >
                    <div className="bg-gray-50/50 dark:bg-white/5 p-6 border-b border-gray-100 dark:border-white/10">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Section Status</h3>
                        <p className="text-xs text-gray-500 dark:text-white/40">Full vs Available</p>
                    </div>
                    <div className="p-6 flex-1 bg-white/40 dark:bg-black/20 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sectionPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={8}
                                    stroke="none"
                                >
                                    {sectionPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-sm font-medium text-gray-600 dark:text-white/60 ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none -mt-4">
                            <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter">{sectionStats.total}</p>
                            <p className="text-[10px] text-gray-500 dark:text-white/40 font-bold uppercase tracking-widest">Total</p>
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
                    className="glass-card rounded-3xl p-1 overflow-hidden"
                >
                    <div className="bg-gray-50/50 dark:bg-white/5 p-6 border-b border-gray-100 dark:border-white/10">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Subject Popularity</h3>
                    </div>
                    <div className="p-6 h-[250px] bg-white/40 dark:bg-black/20">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectPopularity} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--glass-border)" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="code"
                                    type="category"
                                    width={70}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--text-secondary)' }}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                                <Bar dataKey="students" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1500}>
                                    {subjectPopularity.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? NEON_COLORS.primary : NEON_COLORS.secondary} />
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
                    className="glass-card rounded-3xl p-1 overflow-hidden"
                >
                    <div className="bg-gray-50/50 dark:bg-white/5 p-6 border-b border-gray-100 dark:border-white/10">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Activity by Day</h3>
                    </div>
                    <div className="p-6 h-[250px] bg-white/40 dark:bg-black/20">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dayActivity}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: 'white', opacity: 0.05 }} content={<CustomTooltip />} />
                                <Bar
                                    dataKey="count"
                                    fill={NEON_COLORS.quaternary}
                                    radius={[8, 8, 8, 8]}
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
                    className="glass-card rounded-3xl p-1 overflow-hidden"
                >
                    <div className="bg-gray-50/50 dark:bg-white/5 p-6 border-b border-gray-100 dark:border-white/10">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Capacity Health</h3>
                        <p className="text-xs text-gray-500 dark:text-white/40">Utilization distribution</p>
                    </div>
                    <div className="p-6 h-[250px] bg-white/40 dark:bg-black/20">
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
                                    stroke="none"
                                >
                                    {utilizationPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-xs font-medium text-gray-600 dark:text-white/60 ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="lg:col-span-2">
                    <ScheduleHeatmap />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
                    <SeatAvailability />
                </motion.div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="hidden lg:block">
                    <div className="glass-card rounded-3xl p-6 h-full relative overflow-hidden flex flex-col justify-center items-center text-center group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <Calendar className="w-16 h-16 mb-4 text-gray-400 dark:text-white/80 group-hover:scale-110 transition-transform duration-300" />
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Academic Calendar</h3>
                        <p className="text-gray-500 dark:text-white/60 text-sm">Fall 2024 Semester</p>
                        <button className="mt-8 px-6 py-3 glass-button text-sm text-gray-700 dark:text-white">
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
