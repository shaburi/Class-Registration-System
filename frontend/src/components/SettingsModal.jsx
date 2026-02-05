import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ACCENT_COLORS } from '../context/ThemeContext';
import {
    X,
    User,
    Palette,
    Sun,
    Moon,
    Check,
    LogOut,
    Mail,
    GraduationCap,
    Calendar,
    IdCard,
    Save
} from 'lucide-react';
import api from '../services/api';

// Programme options
const PROGRAMMES = [
    { code: 'CT206', name: 'Bachelor of Information Technology (Honours) In Cyber Security', type: 'degree' },
    { code: 'CT204', name: 'Bachelor of Information Technology (Honours) in Computer Application Development', type: 'degree' },
    { code: 'CC101', name: 'Diploma in Computer Science', type: 'diploma' }
];

const SettingsModal = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, accentColor, setAccentColor, accentColors } = useTheme();
    const [activeSection, setActiveSection] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        student_name: '',
        programme: '',
        semester: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen && user) {
            setProfile({
                student_name: user?.student_name || user?.studentName || '',
                programme: user?.programme || '',
                semester: user?.semester || ''
            });
        }
    }, [isOpen, user]);

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error('Failed to logout', error);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!profile.programme) {
            setMessage({ type: 'error', text: 'Please select a programme' });
            return;
        }
        if (!profile.semester) {
            setMessage({ type: 'error', text: 'Please select a semester' });
            return;
        }

        try {
            setSaving(true);
            setMessage({ type: '', text: '' });
            await api.put('/student/profile', {
                student_name: profile.student_name,
                programme: profile.programme,
                semester: parseInt(profile.semester)
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Failed to save profile:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save profile' });
        } finally {
            setSaving(false);
        }
    };

    const selectedProgramme = PROGRAMMES.find(p => p.code === profile.programme);
    const maxSemester = selectedProgramme?.type === 'diploma' ? 6 : 8;

    // Navigation items for settings sidebar
    const settingsNav = [
        { id: 'profile', label: 'Profile', icon: <User size={18} /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    ];



    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-[700px] h-[550px] glass-card bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10 flex overflow-hidden pointer-events-auto"
                        >
                            {/* Left Sidebar */}
                            <div className="w-56 bg-white/5 border-r border-white/10 flex flex-col backdrop-blur-md">
                                {/* Close Button Header */}
                                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-white/50 uppercase tracking-wider pl-2">Settings</span>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Navigation */}
                                <nav className="flex-1 p-3 space-y-1">
                                    {settingsNav.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === item.id
                                                ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30'
                                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>

                                {/* Logout Button */}
                                <div className="p-4 border-t border-white/10 bg-white/5">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 hover:border hover:border-red-500/30 transition-all"
                                    >
                                        <LogOut size={18} />
                                        Log out
                                    </button>
                                </div>
                            </div>

                            {/* Right Content Area */}
                            <div className="flex-1 overflow-y-auto bg-black/20">
                                <div className="p-8">
                                    {/* Profile Section */}
                                    {activeSection === 'profile' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-2xl font-bold text-white tracking-tight">Profile</h2>
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                                                    {user?.student_name?.charAt(0) || 'U'}
                                                </div>
                                            </div>

                                            {/* Message */}
                                            {message.text && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${message.type === 'success'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                        }`}
                                                >
                                                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                                                    {message.text}
                                                </motion.div>
                                            )}

                                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                                {/* Email (Read only) */}
                                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">Email Address</label>
                                                    <div className="flex items-center gap-3 text-white/80">
                                                        <Mail size={18} className="text-indigo-400" />
                                                        {user?.email || 'N/A'}
                                                    </div>
                                                </div>

                                                {/* Name */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-white/70">Full Name</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <IdCard size={18} className="text-white/30" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={profile.student_name}
                                                            onChange={(e) => setProfile({ ...profile, student_name: e.target.value })}
                                                            className="block w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3 py-2.5 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm"
                                                            placeholder="Enter name"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Programme */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-white/70">Programme</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <GraduationCap size={18} className="text-white/30" />
                                                        </div>
                                                        <select
                                                            value={profile.programme}
                                                            onChange={(e) => setProfile({ ...profile, programme: e.target.value, semester: '' })}
                                                            className="block w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3 py-2.5 text-white focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm appearance-none"
                                                        >
                                                            <option value="" className="bg-gray-900">Select Programme...</option>
                                                            {PROGRAMMES.map(prog => (
                                                                <option key={prog.code} value={prog.code} className="bg-gray-900">{prog.code} - {prog.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Semester */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-white/70">Semester</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Calendar size={18} className="text-white/30" />
                                                        </div>
                                                        <select
                                                            value={profile.semester}
                                                            onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                                                            disabled={!profile.programme}
                                                            className="block w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3 py-2.5 text-white focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm appearance-none disabled:opacity-50"
                                                        >
                                                            <option value="" className="bg-gray-900">Select Semester...</option>
                                                            {[...Array(maxSemester)].map((_, i) => (
                                                                <option key={i + 1} value={i + 1} className="bg-gray-900">Semester {i + 1}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Save Button */}
                                                <div className="pt-4">
                                                    <button
                                                        type="submit"
                                                        disabled={saving}
                                                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                Saving Changes...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save size={18} />
                                                                Save Profile Changes
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Appearance Section */}
                                    {activeSection === 'appearance' && (
                                        <div className="space-y-8">
                                            <h2 className="text-2xl font-bold text-white tracking-tight">Appearance</h2>

                                            {/* Theme Toggle */}
                                            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                                <div className="p-4 border-b border-white/10">
                                                    <h3 className="font-medium text-white flex items-center gap-2">
                                                        {theme === 'dark' ? <Moon size={18} className="text-purple-400" /> : <Sun size={18} className="text-amber-400" />}
                                                        Theme Preference
                                                    </h3>
                                                    <p className="text-sm text-white/50 mt-1">Choose how UPTM Scheduling looks for you.</p>
                                                </div>
                                                <div className="p-4 flex gap-4">
                                                    <button
                                                        onClick={() => theme === 'dark' && toggleTheme()}
                                                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border ${theme === 'light'
                                                            ? 'bg-white text-indigo-600 border-indigo-200 shadow-md'
                                                            : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <Sun size={16} /> Light Mode
                                                    </button>
                                                    <button
                                                        onClick={() => theme === 'light' && toggleTheme()}
                                                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border ${theme === 'dark'
                                                            ? 'bg-indigo-500/20 text-white border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                                            : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <Moon size={16} /> Dark Mode
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Accent Color */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Palette size={18} className="text-pink-400" />
                                                    <h3 className="font-medium text-white">Accent Color</h3>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    {Object.entries(accentColors || ACCENT_COLORS).map(([key, color]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => setAccentColor(key)}
                                                            className={`group relative p-3 rounded-xl border transition-all ${accentColor === key
                                                                ? 'border-white/40 bg-white/5 shadow-lg'
                                                                : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${color.gradient} shadow-sm group-hover:scale-105 transition-transform duration-200`} />
                                                            <p className="text-xs font-medium text-white/70 mt-3 text-center">
                                                                {color.name}
                                                            </p>
                                                            {accentColor === key && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    className="absolute top-2 right-2 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-lg"
                                                                >
                                                                    <Check size={12} strokeWidth={3} />
                                                                </motion.div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default SettingsModal;

