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
    User,
    Menu,
    X
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SettingsModal from './SettingsModal';
import StaggeredText from './Anime/StaggeredText';
import NotificationBell from './hop/NotificationBell';

const DashboardLayout = ({ children, role, title, activeTab, onTabChange, hideGreeting = false, headerContent, notifications, onNotificationClick }) => {
    const { user, logout } = useAuth();
    const { accent: userAccent } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
                { id: 'program-structures', icon: <Layers size={20} />, label: 'Program Structures' },
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

    // Role-based gradient (UPTM Brand Color Scheme)
    const getRoleGradient = () => {
        if (role === 'student') return 'from-blue-600 to-blue-600'; // UPTM Navy/Royal Blue variant
        if (role === 'lecturer') return 'from-red-600 to-rose-600'; // UPTM Crimson Red variant
        if (role === 'hop') return 'from-amber-500 to-orange-500'; // Keep distinct for super admins, or use dark grey
        return 'from-blue-600 to-blue-600';
    };

    return (
        <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden relative">
            {/* Mesh Gradient Background */}
            <div className="mesh-gradient-bg" />

            {/* Floating Glass Sidebar (Dynamic Island Style) - Desktop Only */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 90 : 280 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="hidden md:flex relative flex-col h-[94vh] my-[3vh] ml-[3vh] bg-white/40 dark:bg-[#0b0d14]/60 backdrop-blur-3xl rounded-[32px] z-20 overflow-hidden border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]"
            >
                {/* ... */}
                {/* Fast forwarding to the updated SVG def ... */}
                {/* Logo Area */}
                <div className="h-28 flex items-center justify-center px-4 border-b border-gray-200/30 dark:border-white/5 relative z-10">
                    <motion.div
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${userAccent?.gradient || getRoleGradient()} flex items-center justify-center shadow-lg ${userAccent?.shadow || 'shadow-blue-500/20'} relative`}
                    >
                        <Sparkles className="w-6 h-6 text-white relative z-10" />
                        {/* Glow orb behind icon */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${userAccent?.gradient || getRoleGradient()} blur-md opacity-50 rounded-2xl`}></div>
                    </motion.div>
                    <motion.div
                        initial={false}
                        animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto', marginLeft: isCollapsed ? 0 : 16 }}
                        className="overflow-hidden flex items-center"
                    >
                        <span className="font-heading font-extrabold text-2xl tracking-tight text-[var(--text-primary)] whitespace-nowrap mt-1 drop-shadow-sm">
                            UPTM <span className={`text-transparent bg-clip-text bg-gradient-to-r ${getRoleGradient()}`}>HUB</span>
                        </span>
                    </motion.div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto scrollbar-hide relative z-10 w-full">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <div key={item.id} className="relative w-full">
                                {/* Kinetic Active Indicator (Glides behind the item) */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavBackground"
                                        className="absolute inset-0 bg-white/50 dark:bg-white/5 rounded-2xl border border-white/60 dark:border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <motion.button
                                    onClick={() => onTabChange && onTabChange(item.id)}
                                    className={`
                                        w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative z-10
                                        ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}
                                    `}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <div className={`transition-all duration-300 relative z-10 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                            {/* Clone icon to apply active gradient styling dynamically */}
                                            {React.cloneElement(item.icon, {
                                                className: isActive
                                                    ? 'text-transparent bg-clip-text' // Need SVG styling for gradients generally, but we can simulate via a container below
                                                    : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
                                                stroke: isActive ? 'url(#active-icon-gradient)' : 'currentColor',
                                                strokeWidth: isActive ? 2.5 : 2
                                            })}

                                            {/* Deep Glow Aura underneath active icon */}
                                            {isActive && (
                                                <div className={`absolute inset-0 bg-gradient-to-r ${getRoleGradient()} blur-[10px] opacity-40 rounded-full z-[-1]`}></div>
                                            )}
                                        </div>
                                    </div>

                                    <motion.span
                                        initial={false}
                                        animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                                        className={`font-semibold whitespace-nowrap overflow-hidden tracking-wide text-sm ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        {item.label}
                                    </motion.span>

                                    {/* SVG Definition for Icon Gradients (hack for Lucide icons) */}
                                    {isActive && (
                                        <svg width="0" height="0" className="absolute">
                                            <linearGradient id="active-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                {role === 'student' && <><stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#4f46e5" /></>}
                                                {role === 'lecturer' && <><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#e11d48" /></>}
                                                {role === 'hop' && <><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#f97316" /></>}
                                            </linearGradient>
                                        </svg>
                                    )}
                                </motion.button>
                            </div>
                        );
                    })}
                </nav>

                {/* Minimal Dark Mode Toggle inside Sidebar */}
                <div className={`mt-auto mx-4 mb-2 flex items-center z-30 ${isCollapsed ? 'justify-center' : 'justify-between px-3 py-1.5 bg-white/40 dark:bg-black/20 rounded-[14px] border border-white/50 dark:border-white/10 shadow-sm backdrop-blur-md'}`}>
                    {!isCollapsed && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            Theme
                        </span>
                    )}
                    <ThemeToggle className={isCollapsed ? '' : 'scale-90 shadow-none hover:bg-white dark:hover:bg-white/10 rounded-lg'} />
                </div>

                {/* Interactive Profile Pod */}
                <div className="mx-4 mb-4 relative z-20 group">
                    <motion.div
                        className="bg-white/60 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-2xl p-2 cursor-pointer backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.2)] transition-all duration-300 hover:bg-white/80 dark:hover:bg-black/50"
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        ref={profileMenuRef}
                    >
                        <div className={`flex items-center ${isCollapsed ? 'justify-center p-1' : 'gap-3 px-2 py-1'}`}>
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleGradient()} flex items-center justify-center text-white font-extrabold shadow-lg shrink-0 overflow-hidden ring-2 ring-white/50 dark:ring-black/50`}>
                                {profilePicture ? (
                                    <img src={profilePicture} alt={displayName} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                                ) : (
                                    <span>{displayName.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-[13px] font-extrabold text-[var(--text-primary)] truncate tracking-wide leading-tight mb-0.5">{displayName}</p>
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">{userRole}</p>
                                </div>
                            )}
                            {!isCollapsed && (
                                <ChevronUp size={14} className={`text-[var(--text-secondary)] transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Profile Modal/Dropdown */}
                <AnimatePresence>
                    {showProfileMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className={`absolute ${isCollapsed ? 'left-24 bottom-6' : 'bottom-[88px] left-4 right-4'} bg-white/90 dark:bg-[#11131e]/90 border border-white/50 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] rounded-[20px] p-2 z-50 backdrop-blur-xl`}
                        >
                            <button
                                onClick={handleSettingsClick}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left"
                            >
                                <Settings size={18} />
                                {!isCollapsed && <span className="text-sm font-bold tracking-wide">Settings</span>}
                            </button>
                            <div className="h-px bg-gray-200/50 dark:bg-white/5 my-1 mx-2"></div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors text-left group"
                            >
                                <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                                {!isCollapsed && <span className="text-sm font-bold tracking-wide">Log out</span>}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapse Toggle Bubble */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-[#1a1d29] border border-gray-200 dark:border-white/10 p-2 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:scale-110 transition-all z-50 text-[var(--text-primary)] group"
                >
                    <div className="group-hover:text-blue-500 transition-colors">
                        {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
                    </div>
                </button>
            </motion.aside>

            {/* Mobile Navigation Drawer Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] md:hidden"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-white/80 dark:bg-[#0b0d14]/90 backdrop-blur-3xl border-r border-white/40 dark:border-white/10 flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getRoleGradient()} flex items-center justify-center shadow-lg relative`}>
                                        <Sparkles className="w-5 h-5 text-white relative z-10" />
                                    </div>
                                    <span className="font-heading font-extrabold text-xl tracking-tight text-[var(--text-primary)]">
                                        UPTM <span className={`text-transparent bg-clip-text bg-gradient-to-r ${getRoleGradient()}`}>HUB</span>
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                                {navItems.map((item) => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                onTabChange && onTabChange(item.id);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`
                                                w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300
                                                ${isActive
                                                    ? 'bg-white/50 dark:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-[var(--text-primary)] border border-white/60 dark:border-white/10'
                                                    : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'
                                                }
                                            `}
                                        >
                                            <div className={`${isActive ? 'scale-110' : ''}`}>
                                                {React.cloneElement(item.icon, {
                                                    className: isActive ? 'text-transparent bg-clip-text' : 'currentColor',
                                                    stroke: isActive ? 'url(#active-icon-gradient)' : 'currentColor',
                                                    strokeWidth: isActive ? 2.5 : 2
                                                })}
                                            </div>
                                            <span className={`font-semibold tracking-wide text-[15px] ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                {item.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>

                            <div className="p-4 border-t border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-black/20">
                                <div className="flex items-center gap-3 mb-4 px-2">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleGradient()} flex items-center justify-center text-white font-extrabold shadow-lg shrink-0 overflow-hidden ring-2 ring-white/50 dark:ring-black/50`}>
                                        {profilePicture ? (
                                            <img src={profilePicture} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                            <span>{displayName.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-extrabold text-[var(--text-primary)] truncate">{displayName}</p>
                                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-bold">{userRole}</p>
                                    </div>
                                    <ThemeToggle />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { setIsMobileMenuOpen(false); setShowSettingsModal(true); }}
                                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-[var(--text-primary)] font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/10"
                                    >
                                        <Settings size={16} />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-500/20"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative">

                {/* Mobile Header */}
                <div className="md:hidden flex flex-shrink-0 items-center justify-between px-4 py-3 bg-white/70 dark:bg-[#0b0d14]/80 backdrop-blur-xl border-b border-white/40 dark:border-white/10 z-[40]">
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 bg-white/50 dark:bg-white/5 rounded-xl border border-white/50 dark:border-white/10 text-[var(--text-primary)] shadow-sm"
                        >
                            <Menu size={20} />
                        </motion.button>
                        <span className="font-heading font-extrabold text-xl tracking-tight text-[var(--text-primary)]">
                            UPTM <span className={`text-transparent bg-clip-text bg-gradient-to-r ${getRoleGradient()}`}>HUB</span>
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">
                    <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
                        {/* Dynamic Header (Unboxed & Airy) */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative z-50 flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-2 pb-6 px-2 border-b border-gray-200/50 dark:border-white/5"
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
                            <div className="flex items-center gap-3">
                                {role === 'hop' && notifications && (
                                    <NotificationBell
                                        notifications={notifications}
                                        onNotificationClick={onNotificationClick}
                                    />
                                )}
                                <SessionSelector />
                            </div>
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
        <div className="relative z-[60]" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-5 py-3 glass-input rounded-xl hover:translate-y-[-2px] hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
            >
                <div className="bg-blue-500/10 p-2 rounded-lg">
                    <CalendarDays size={20} className="text-blue-500" />
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
                        className="absolute right-0 top-full mt-3 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5"
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
                                            ? 'bg-blue-500/10'
                                            : 'hover:bg-[var(--glass-border)]'
                                        }`}
                                >
                                    <div className="text-left">
                                        <div className={`text-sm font-bold ${selectedSession.id === session.id ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>
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
