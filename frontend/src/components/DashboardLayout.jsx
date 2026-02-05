import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    FileText,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Users,
    Sparkles,
    Settings,
    ChevronUp,
    CalendarDays,
    ChevronDown,
    Archive,
    Layers,
    CalendarRange,
    Clock,
    FileMinus,
    UserPlus,
    BookCopy,
    GraduationCap,
    CalendarClock,
    CloudDownload,
    User
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SettingsModal from './SettingsModal';
import StaggeredText from './Anime/StaggeredText';
import InteractiveGrid from './Anime/InteractiveGrid';

const DashboardLayout = ({ children, role, title, activeTab, onTabChange }) => {
    const { user, logout } = useAuth();
    const { accent: userAccent } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const profileMenuRef = useRef(null);

    // Get profile picture - prefer Google photoURL
    const profilePicture = user?.photoURL || user?.profilePicture || null;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error('Failed to logout', error);
        }
    };

    const handleSettingsClick = () => {
        setShowProfileMenu(false);
        setShowSettingsModal(true);
    };

    // Define navigation items based on role (removed settings from nav)
    const getNavItems = () => {
        if (role === 'student') {
            return [
                { id: 'browse', icon: <BookOpen size={20} />, label: 'Register Courses' },
                { id: 'builder', icon: <Sparkles size={20} />, label: 'Build Timetable' },
                { id: 'timetable', icon: <CalendarClock size={20} />, label: 'My Timetable' },
                { id: 'semester-view', icon: <CalendarRange size={20} />, label: 'Semester View' },
                { id: 'programme-schedules', icon: <GraduationCap size={20} />, label: 'Programme Schedules' },
                { id: 'lecturer-schedules', icon: <User size={20} />, label: 'Lecturer Schedules' },
                { id: 'requests', icon: <FileText size={20} />, label: 'Requests' },
            ];
        } else if (role === 'lecturer') {
            return [
                { id: 'students', icon: <GraduationCap size={20} />, label: 'My Students' },
                { id: 'schedule', icon: <CalendarClock size={20} />, label: 'My Schedule' },
            ];
        } else if (role === 'hop') {
            return [
                { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Overview' },
                { id: 'subjects', icon: <BookCopy size={20} />, label: 'Manage Subjects' },
                { id: 'sections', icon: <Layers size={20} />, label: 'Manage Sections' },
                { id: 'timetable', icon: <CalendarRange size={20} />, label: 'Global Timetable' },
                { id: 'edupage', icon: <CloudDownload size={20} />, label: 'aSc Timetable' },
                { id: 'sessions', icon: <Clock size={20} />, label: 'Sessions' },
                { id: 'drop-requests', icon: <FileMinus size={20} />, label: 'Drop Requests' },
                { id: 'manual-requests', icon: <UserPlus size={20} />, label: 'Manual Requests' },
            ];
        }
        return [];
    };

    const navItems = getNavItems();

    // Get user display name
    const displayName = user?.displayName || user?.student_name || user?.studentName || user?.lecturerName || user?.name || user?.email?.split('@')[0] || 'User';
    const userEmail = user?.email || '';
    const userRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

    // Role-based gradient - use user accent for students
    const getRoleGradient = () => {
        if (role === 'student') return userAccent?.gradient || 'from-indigo-600 via-purple-600 to-pink-500';
        if (role === 'lecturer') return 'from-emerald-600 via-teal-600 to-cyan-500';
        if (role === 'hop') return 'from-purple-600 via-pink-600 to-rose-500';
        return 'from-blue-600 via-indigo-600 to-purple-500';
    };

    const getRoleAccent = () => {
        if (role === 'student') return userAccent || { bg: 'bg-indigo-500', text: 'text-indigo-400', hover: 'hover:bg-indigo-500/10' };
        if (role === 'lecturer') return { bg: 'bg-emerald-500', text: 'text-emerald-400', hover: 'hover:bg-emerald-500/10' };
        if (role === 'hop') return { bg: 'bg-purple-500', text: 'text-purple-400', hover: 'hover:bg-purple-500/10' };
        return { bg: 'bg-blue-500', text: 'text-blue-400', hover: 'hover:bg-blue-500/10' };
    };

    const accent = getRoleAccent();

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950 overflow-hidden">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 80 : 280 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="relative flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 shadow-xl z-20"
            >
                {/* Decorative gradient line at top */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getRoleGradient()}`} />

                {/* Toggle Button */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`absolute -right-3 top-8 ${accent.bg} text-white rounded-full p-1.5 shadow-lg hover:shadow-xl transition-shadow z-30`}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </motion.button>

                {/* Logo Area */}
                <div className="h-20 flex items-center px-5 border-b border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-center gap-3">
                        <motion.div
                            whileHover={{ rotate: 180, scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                            className={`w-10 h-10 bg-gradient-to-br ${getRoleGradient()} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}
                        >
                            <Sparkles className="w-5 h-5 text-white" />
                        </motion.div>
                        <motion.div
                            initial={false}
                            animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <span className="font-bold text-xl bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent whitespace-nowrap">
                                UPTM Schedule
                            </span>
                        </motion.div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
                    {navItems.map((item, index) => (
                        <motion.button
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => onTabChange && onTabChange(item.id)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                                ${activeTab === item.id
                                    ? `bg-gradient-to-r ${getRoleGradient()} text-white shadow-lg`
                                    : `text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200`
                                }
                            `}
                        >
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="flex-shrink-0"
                            >
                                {item.icon}
                            </motion.div>
                            <motion.span
                                initial={false}
                                animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                                transition={{ duration: 0.2 }}
                                className="whitespace-nowrap overflow-hidden font-medium"
                            >
                                {item.label}
                            </motion.span>
                        </motion.button>
                    ))}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800/50">
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
                        {!isCollapsed && (
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Theme
                            </span>
                        )}
                        <ThemeToggle />
                    </div>
                </div>

                {/* User Profile Section with Dropdown */}
                <div className="relative p-4 border-t border-gray-100 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/30" ref={profileMenuRef}>
                    {/* ChatGPT-style Dropdown Menu */}
                    <AnimatePresence>
                        {showProfileMenu && !isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-full left-2 right-2 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                            >
                                {/* User Info Header */}
                                <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg ${profilePicture ? '' : `bg-gradient-to-br ${getRoleGradient()}`} flex items-center justify-center overflow-hidden`}>
                                            {profilePicture ? (
                                                <img src={profilePicture} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <span className="text-white font-bold">{displayName.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{displayName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    {role === 'student' && (
                                        <button
                                            onClick={handleSettingsClick}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                        >
                                            <Settings size={18} />
                                            <span className="text-sm">Settings</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                    >
                                        <LogOut size={18} />
                                        <span className="text-sm">Log out</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Profile Button */}
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg p-2 -m-2 transition-colors`}
                    >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-lg ${profilePicture ? '' : `bg-gradient-to-br ${getRoleGradient()}`} flex items-center justify-center text-white font-bold shadow-md flex-shrink-0 relative overflow-hidden`}>
                            {profilePicture ? (
                                <img src={profilePicture} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="text-base">{displayName.charAt(0).toUpperCase()}</span>
                            )}
                            {/* Online indicator */}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                        </div>

                        {/* Name & Role */}
                        {!isCollapsed && (
                            <>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {displayName}
                                    </p>
                                    <p className={`text-xs ${accent.text} font-medium truncate`}>
                                        {userRole}
                                    </p>
                                </div>
                                <motion.div
                                    animate={{ rotate: showProfileMenu ? 180 : 0 }}
                                    className="text-gray-400"
                                >
                                    <ChevronUp size={16} />
                                </motion.div>
                            </>
                        )}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Subtle background pattern */}
                <InteractiveGrid />
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header with Session Selector */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className={`text-3xl font-bold bg-gradient-to-r ${getRoleGradient()} bg-clip-text text-transparent`}>
                                    <StaggeredText text={title} />
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Welcome back, {displayName.split(' ')[0]}! Here's what's happening today.
                                </p>
                            </div>

                            {/* Session Selector */}
                            <SessionSelector />
                        </div>
                    </motion.div>

                    {children}
                </div>
            </main>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
            />
        </div>
    );
};

// Session Selector Component
const SessionSelector = () => {
    const { sessions, selectedSession, selectSession, isActiveSession, loading } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading || !selectedSession) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <CalendarDays size={18} className="text-gray-400" />
                <span className="text-sm text-gray-500">Loading...</span>
            </div>
        );
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">Active</span>;
            case 'upcoming':
                return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">Upcoming</span>;
            case 'archived':
                return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full flex items-center gap-1"><Archive size={10} /> Archived</span>;
            default:
                return null;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all"
            >
                <CalendarDays size={18} className="text-indigo-500" />
                <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedSession.code}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedSession.name}
                    </div>
                </div>
                {getStatusBadge(selectedSession.status)}
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">Select Academic Session</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {sessions.map((session) => (
                                <button
                                    key={session.id}
                                    onClick={() => {
                                        selectSession(session.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedSession.id === session.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                        }`}
                                >
                                    <div className="text-left">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {session.code}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {session.name}
                                        </div>
                                    </div>
                                    {getStatusBadge(session.status)}
                                </button>
                            ))}
                        </div>
                        {!isActiveSession && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    ⚠️ Viewing archived session. Registration is disabled.
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardLayout;
