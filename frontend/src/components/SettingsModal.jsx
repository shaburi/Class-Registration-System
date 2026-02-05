import React, { useState, useEffect } from 'react';
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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal Container - Centers the modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-[700px] h-[550px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex overflow-hidden pointer-events-auto"
                        >
                            {/* Left Sidebar */}
                            <div className="w-48 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                                {/* Close Button */}
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                                    </button>
                                </div>

                                {/* Navigation */}
                                <nav className="flex-1 p-2 space-y-1">
                                    {settingsNav.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection === item.id
                                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                                }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>

                                {/* Logout Button */}
                                <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <LogOut size={18} />
                                        Log out
                                    </button>
                                </div>
                            </div>

                            {/* Right Content Area */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-6">
                                    {/* Profile Section */}
                                    {activeSection === 'profile' && (
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Profile</h2>

                                            {/* Message */}
                                            {message.text && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success'
                                                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}
                                                >
                                                    {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
                                                    {message.text}
                                                </motion.div>
                                            )}

                                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                                {/* Email */}
                                                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-3">
                                                        <Mail size={18} className="text-gray-400" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-300">Email</span>
                                                    </div>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email || 'N/A'}</span>
                                                </div>

                                                {/* Name */}
                                                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        <IdCard size={18} className="text-gray-400" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-300">Full Name</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={profile.student_name}
                                                        onChange={(e) => setProfile({ ...profile, student_name: e.target.value })}
                                                        className="text-sm text-right bg-transparent border-none focus:ring-0 focus:outline-none text-gray-900 dark:text-white flex-1 min-w-0 ml-4"
                                                        placeholder="Enter name"
                                                    />
                                                </div>

                                                {/* Programme */}
                                                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-3">
                                                        <GraduationCap size={18} className="text-gray-400" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-300">Programme</span>
                                                    </div>
                                                    <select
                                                        value={profile.programme}
                                                        onChange={(e) => setProfile({ ...profile, programme: e.target.value, semester: '' })}
                                                        className="text-sm text-right bg-gray-100 dark:bg-gray-700 border-none focus:ring-0 text-gray-900 dark:text-white cursor-pointer rounded-lg px-3 py-1.5"
                                                    >
                                                        <option value="" className="bg-white dark:bg-gray-800">Select...</option>
                                                        {PROGRAMMES.map(prog => (
                                                            <option key={prog.code} value={prog.code} className="bg-white dark:bg-gray-800">{prog.code}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Semester */}
                                                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-3">
                                                        <Calendar size={18} className="text-gray-400" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-300">Semester</span>
                                                    </div>
                                                    <select
                                                        value={profile.semester}
                                                        onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                                                        disabled={!profile.programme}
                                                        className="text-sm text-right bg-gray-100 dark:bg-gray-700 border-none focus:ring-0 text-gray-900 dark:text-white cursor-pointer rounded-lg px-3 py-1.5 disabled:opacity-50"
                                                    >
                                                        <option value="" className="bg-white dark:bg-gray-800">Select...</option>
                                                        {[...Array(maxSemester)].map((_, i) => (
                                                            <option key={i + 1} value={i + 1} className="bg-white dark:bg-gray-800">Semester {i + 1}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Save Button */}
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                                                >
                                                    {saving ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save size={18} />
                                                            Save Changes
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        </div>
                                    )}

                                    {/* Appearance Section */}
                                    {activeSection === 'appearance' && (
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Appearance</h2>

                                            {/* Theme Toggle */}
                                            <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-3">
                                                    {theme === 'dark' ? <Moon size={18} className="text-gray-400" /> : <Sun size={18} className="text-gray-400" />}
                                                    <span className="text-sm text-gray-600 dark:text-gray-300">Theme</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => theme === 'dark' && toggleTheme()}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${theme === 'light'
                                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        Light
                                                    </button>
                                                    <button
                                                        onClick={() => theme === 'light' && toggleTheme()}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${theme === 'dark'
                                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        Dark
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Accent Color */}
                                            <div className="py-4">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Palette size={18} className="text-gray-400" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-300">Accent color</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {Object.entries(accentColors || ACCENT_COLORS).map(([key, color]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => setAccentColor(key)}
                                                            className={`relative p-3 rounded-xl border-2 transition-all ${accentColor === key
                                                                ? 'border-gray-900 dark:border-white shadow-lg'
                                                                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                                                }`}
                                                        >
                                                            <div className={`w-full aspect-square rounded-lg bg-gradient-to-br ${color.gradient} shadow-md`} />
                                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-2 text-center">
                                                                {color.name}
                                                            </p>
                                                            {accentColor === key && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    className="absolute top-1 right-1 w-5 h-5 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow"
                                                                >
                                                                    <Check className="w-3 h-3 text-gray-900 dark:text-white" />
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
        </AnimatePresence>
    );
};

export default SettingsModal;

