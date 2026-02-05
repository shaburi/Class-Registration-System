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

const DashboardLayout = ({ children, role, title, activeTab, onTabChange, hideGreeting = false, headerContent }) => {
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
                { id: 'student-logs', icon: <FileText size={20} />, label: 'Student Logs' },
            ];
        }
        return [];
    };

    const navItems = getNavItems();

    // Get user display name
    const displayName = user?.displayName || user?.student_name || user?.studentName || user?.lecturerName || user?.name || user?.email?.split('@')[0] || 'User';
    const userEmail = user?.email || '';
    const userRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

    // Role-based gradient
    const getRoleGradient = () => {
        if (role === 'student') return 'from-indigo-500 to-purple-500';
        if (role === 'lecturer') return 'from-emerald-500 to-teal-500';
        if (role === 'hop') return 'from-rose-500 to-orange-500';
        return 'from-blue-500 to-indigo-500';
    };

    return (
        <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden relative">
            {/* Mesh Gradient Background */}
            <div className="mesh-gradient-bg" />

            {/* Glass Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 90 : 280 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col h-[96vh] my-[2vh] ml-[2vh] glass-card rounded-3xl z-20 overflow-hidden"
            >
                {/* Logo Area */}
                <div className="h-24 flex items-center justify-center px-4 border-b border-[var(--glass-border)]">
                    <motion.div
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getRoleGradient()} flex items-center justify-center shadow-lg shadow-indigo-500/20`}
                    >
                        <Sparkles className="w-6 h-6 text-white" />
                    </motion.div>
                    <motion.div
                        initial={false}
                        animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto', marginLeft: isCollapsed ? 0 : 16 }}
                        className="overflow-hidden"
                    >
                        <span className="font-heading font-bold text-xl tracking-tight text-[var(--text-primary)] whitespace-nowrap">
                            UPTM <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Schedule</span>
                        </span>
                    </motion.div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto scrollbar-hide">
                    {navItems.map((item) => (
                        <motion.button
                            key={item.id}
                            onClick={() => onTabChange && onTabChange(item.id)}
                            className={`
                                w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                                ${activeTab === item.id
                                    ? `bg-gradient-to-r ${getRoleGradient()} text-white shadow-lg shadow-indigo-500/25`
                                    : `text-[var(--text-secondary)] hover:bg-[var(--glass-border)] hover:text-[var(--text-primary)]`
                                }
                            `}
                        >
                            <div className={`${activeTab === item.id ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--neon-accent)]'} transition-colors`}>
                                {item.icon}
                            </div>
                            <motion.span
                                animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                                className="font-medium whitespace-nowrap overflow-hidden"
                            >
                                {item.label}
                            </motion.span>
                        </motion.button>
                    ))}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-[var(--glass-border)]">
                    <div className="flex items-center justify-center mb-4">
                        <ThemeToggle />
                    </div>
                </div>

                {/* User Profile */}
                <div className="p-4 bg-[var(--glass-bg)] border-t border-[var(--glass-border)] cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    ref={profileMenuRef}
                >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <div className={`w-10 h-10 rounded-full ${profilePicture ? '' : `bg-gradient-to-br ${getRoleGradient()}`} flex items-center justify-center text-white font-bold shadow-md`}>
                            {profilePicture ? (
                                <img src={profilePicture} alt={displayName} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                            ) : (
                                <span>{displayName.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{displayName}</p>
                                <p className="text-xs text-[var(--text-secondary)] truncate">{userRole}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Modal/Dropdown */}
                <AnimatePresence>
                    {showProfileMenu && !isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-20 left-4 right-4 bg-[var(--bg-secondary)] border border-[var(--glass-border)] shadow-xl rounded-2xl p-2 z-50 backdrop-blur-3xl"
                        >
                            {role === 'student' && (
                                <button
                                    onClick={handleSettingsClick}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--glass-border)] text-[var(--text-primary)] transition-colors text-left"
                                >
                                    <Settings size={18} />
                                    <span className="text-sm font-medium">Settings</span>
                                </button>
                            )}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors text-left"
                            >
                                <LogOut size={18} />
                                <span className="text-sm font-medium">Log out</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapse Toggle Bubble */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-12 bg-[var(--bg-secondary)] border border-[var(--glass-border)] p-1.5 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all z-50 text-[var(--text-primary)]"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                <div className="h-full overflow-y-auto p-4 sm:p-8">
                    <div className="max-w-[1600px] mx-auto space-y-8">
                        {/* Dynamic Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 glass-card p-6 rounded-3xl"
                        >
                            <div className="flex-1">
                                {headerContent ? headerContent : (
                                    <>
                                        <h1 className="text-4xl font-heading font-extrabold text-[var(--text-primary)] tracking-tight">
                                            <StaggeredText text={title} />
                                        </h1>
                                        {!hideGreeting && (
                                            <p className="text-[var(--text-secondary)] mt-2 font-medium">
                                                Welcome back, {displayName.split(' ')[0]}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                            <SessionSelector />
                        </motion.div>

                        {/* Page Content */}
                        <div className="fade-in-up delay-100">
                            {children}
                        </div>
                    </div>
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

// Glass Session Selector
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
                return <span className="px-2 py-0.5 text-xs font-bold bg-green-500/20 text-green-600 dark:text-green-400 rounded-full border border-green-500/20">Active</span>;
            case 'upcoming':
                return <span className="px-2 py-0.5 text-xs font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">Upcoming</span>;
            case 'archived':
                return <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-gray-500/20 text-gray-600 dark:text-gray-400 rounded-full border border-gray-500/20"><Archive size={10} /> Archived</span>;
            default:
                return null;
        }
    };

    return (
        <div className="relative z-30" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-5 py-3 glass-input rounded-xl hover:translate-y-[-2px] hover:shadow-lg transition-all"
            >
                <div className="bg-indigo-500/10 p-2 rounded-lg">
                    <CalendarDays size={20} className="text-indigo-500" />
                </div>
                <div className="text-left">
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                        {selectedSession.code}
                    </div>
                    <div className="text-xs font-medium text-[var(--text-secondary)]">
                        {selectedSession.name}
                    </div>
                </div>
                {getStatusBadge(selectedSession.status)}
                <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-3 w-80 glass-card rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5"
                    >
                        <div className="p-3 bg-[var(--bg-primary)]/50 border-b border-[var(--glass-border)]">
                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider px-2">Select Academic Session</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {sessions.map((session) => (
                                <button
                                    key={session.id}
                                    onClick={() => {
                                        selectSession(session.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-5 py-4 transition-all border-b border-[var(--glass-border)] last:border-0
                                        ${selectedSession.id === session.id
                                            ? 'bg-indigo-500/10'
                                            : 'hover:bg-[var(--glass-border)]'
                                        }`}
                                >
                                    <div className="text-left">
                                        <div className={`text-sm font-bold ${selectedSession.id === session.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-primary)]'}`}>
                                            {session.code}
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {session.name}
                                        </div>
                                    </div>
                                    {getStatusBadge(session.status)}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardLayout;
