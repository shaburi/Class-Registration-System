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
    Save,
    Shield,
    ShieldCheck,
    ShieldOff,
    KeyRound,
    Loader2,
    AlertCircle
} from 'lucide-react';
import api from '../services/api';
import MFASetupModal from './MFASetupModal';

// Programme options
const PROGRAMMES = [
    { code: 'CT206', name: 'Bachelor of Information Technology (Honours) In Cyber Security', type: 'degree' },
    { code: 'CT204', name: 'Bachelor of Information Technology (Honours) in Computer Application Development', type: 'degree' },
    { code: 'CC101', name: 'Diploma in Computer Science', type: 'diploma' }
];

// Generate intake session options (past 3 years and next year)
const generateIntakeSessions = () => {
    const currentYear = new Date().getFullYear();
    const sessions = [];

    for (let year = currentYear - 3; year <= currentYear + 1; year++) {
        const yearSuffix = String(year).slice(-2);
        sessions.push(
            { code: `05${yearSuffix}`, name: `May ${year}`, type: 'may' },
            { code: `08${yearSuffix}`, name: `August ${year}`, type: 'august' },
            { code: `12${yearSuffix}`, name: `December ${year}`, type: 'december' }
        );
    }

    // Sort by year descending then by month
    return sessions.sort((a, b) => {
        const yearA = parseInt(a.code.slice(-2));
        const yearB = parseInt(b.code.slice(-2));
        if (yearB !== yearA) return yearB - yearA;
        const monthA = parseInt(a.code.slice(0, 2));
        const monthB = parseInt(b.code.slice(0, 2));
        return monthB - monthA;
    });
};

const INTAKE_SESSIONS = generateIntakeSessions();

const SettingsModal = ({ isOpen, onClose }) => {
    const { user, logout, setUser } = useAuth();
    const { theme, toggleTheme, accentColor, setAccentColor, accentColors } = useTheme();
    const [activeSection, setActiveSection] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        student_name: '',
        programme: '',
        semester: '',
        intake_session: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaLoading, setMfaLoading] = useState(true);
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [disableToken, setDisableToken] = useState('');
    const [disableError, setDisableError] = useState('');
    const [disabling, setDisabling] = useState(false);
    const [showDisableForm, setShowDisableForm] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setProfile({
                student_name: user?.student_name || user?.studentName || '',
                programme: user?.programme || '',
                semester: user?.semester || '',
                intake_session: user?.intake_session || ''
            });
            // Load MFA status
            loadMfaStatus();
        }
    }, [isOpen, user]);

    const loadMfaStatus = async () => {
        try {
            setMfaLoading(true);
            const response = await api.get('/auth/mfa/status');
            setMfaEnabled(response.data.mfaEnabled);
        } catch (err) {
            console.error('Failed to load MFA status:', err);
        } finally {
            setMfaLoading(false);
        }
    };

    const handleDisableMfa = async (e) => {
        e.preventDefault();
        if (disableToken.length !== 6) {
            setDisableError('Please enter a 6-digit code');
            return;
        }
        setDisabling(true);
        setDisableError('');
        try {
            await api.post('/auth/mfa/disable', { token: disableToken });
            setMfaEnabled(false);
            setShowDisableForm(false);
            setDisableToken('');
        } catch (err) {
            setDisableError(err.response?.data?.message || 'Invalid code');
        } finally {
            setDisabling(false);
        }
    };

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
            const response = await api.put('/student/profile', {
                student_name: profile.student_name,
                programme: profile.programme,
                semester: parseInt(profile.semester),
                intake_session: profile.intake_session || undefined
            });

            // Update user context directly instead of reloading
            if (response.data?.data) {
                setUser(prevUser => ({
                    ...prevUser,
                    ...response.data.data
                }));
            }

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Failed to save profile:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save profile' });
        } finally {
            setSaving(false);
        }
    };

    const isStudent = user?.role === 'student';
    const selectedProgramme = PROGRAMMES.find(p => p.code === profile.programme);
    const maxSemester = selectedProgramme?.type === 'diploma' ? 6 : 8;

    const settingsNav = [
        ...(isStudent ? [{ id: 'profile', label: 'Profile', icon: <User size={18} /> }] : []),
        { id: 'security', label: 'Security', icon: <Shield size={18} /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    ];

    if (!isStudent && activeSection === 'profile') {
        setActiveSection('security');
    }



    const modal = createPortal(
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
                            className="w-full max-w-[700px] h-[550px] glass-card bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-blue-500/10 flex overflow-hidden pointer-events-auto"
                        >
                            {/* Left Sidebar */}
                            <div className="w-56 bg-gray-50/80 dark:bg-white/5 border-r border-gray-200 dark:border-white/10 flex flex-col backdrop-blur-md">
                                {/* Close Button Header */}
                                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider pl-2">Settings</span>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg bg-gray-200/50 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-all"
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
                                                ? 'bg-gradient-to-r from-blue-500/10 to-red-500/10 dark:from-blue-500/20 dark:to-red-500/20 text-blue-600 dark:text-white border border-blue-500/20 dark:border-blue-500/30'
                                                : 'text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                                }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>

                                {/* Logout Button */}
                                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-white hover:bg-red-50 dark:hover:bg-red-500/20 hover:border hover:border-red-200 dark:hover:border-red-500/30 transition-all"
                                    >
                                        <LogOut size={18} />
                                        Log out
                                    </button>
                                </div>
                            </div>

                            {/* Right Content Area */}
                            <div className="flex-1 overflow-y-auto bg-white/50 dark:bg-black/20">
                                <div className="p-8">
                                    {/* Profile Section */}
                                    {activeSection === 'profile' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Profile</h2>
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                                                    {user?.student_name?.charAt(0) || 'U'}
                                                </div>
                                            </div>

                                            {/* Message */}
                                            {message.text && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${message.type === 'success'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                                                        }`}
                                                >
                                                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                                                    {message.text}
                                                </motion.div>
                                            )}

                                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                                {/* Email (Read only) */}
                                                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                                                    <label className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">Email Address</label>
                                                    <div className="flex items-center gap-3 text-gray-700 dark:text-white/80">
                                                        <Mail size={18} className="text-blue-500 dark:text-blue-400" />
                                                        {user?.email || 'N/A'}
                                                    </div>
                                                </div>

                                                {/* Name */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700 dark:text-white/70">Full Name</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <IdCard size={18} className="text-gray-400 dark:text-white/30" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={profile.student_name}
                                                            onChange={(e) => setProfile({ ...profile, student_name: e.target.value })}
                                                            className="block w-full rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-10 pr-3 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500 transition-all sm:text-sm"
                                                            placeholder="Enter name"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Programme */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700 dark:text-white/70">Programme</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <GraduationCap size={18} className="text-gray-400 dark:text-white/30" />
                                                        </div>
                                                        <select
                                                            value={profile.programme}
                                                            onChange={(e) => setProfile({ ...profile, programme: e.target.value, semester: '' })}
                                                            className="block w-full rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-10 pr-3 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500 transition-all sm:text-sm appearance-none"
                                                        >
                                                            <option value="" className="bg-white dark:bg-gray-900">Select Programme...</option>
                                                            {PROGRAMMES.map(prog => (
                                                                <option key={prog.code} value={prog.code} className="bg-white dark:bg-gray-900">{prog.code} - {prog.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Semester */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700 dark:text-white/70">Semester</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Calendar size={18} className="text-gray-400 dark:text-white/30" />
                                                        </div>
                                                        <select
                                                            value={profile.semester}
                                                            onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                                                            disabled={!profile.programme}
                                                            className="block w-full rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-10 pr-3 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500 transition-all sm:text-sm appearance-none disabled:opacity-50"
                                                        >
                                                            <option value="" className="bg-white dark:bg-gray-900">Select Semester...</option>
                                                            {[...Array(maxSemester)].map((_, i) => (
                                                                <option key={i + 1} value={i + 1} className="bg-white dark:bg-gray-900">Semester {i + 1}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Intake Session */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700 dark:text-white/70">Intake Session</label>
                                                    <p className="text-xs text-gray-500 dark:text-white/40">Select when you started your programme</p>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Calendar size={18} className="text-gray-400 dark:text-white/30" />
                                                        </div>
                                                        <select
                                                            value={profile.intake_session}
                                                            onChange={(e) => setProfile({ ...profile, intake_session: e.target.value })}
                                                            className="block w-full rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-10 pr-3 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500 transition-all sm:text-sm appearance-none"
                                                        >
                                                            <option value="" className="bg-white dark:bg-gray-900">Select Intake Session...</option>
                                                            {INTAKE_SESSIONS.map(session => (
                                                                <option key={session.code} value={session.code} className="bg-white dark:bg-gray-900">
                                                                    {session.name} ({session.code})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Save Button */}
                                                <div className="pt-4">
                                                    <button
                                                        type="submit"
                                                        disabled={saving}
                                                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-red-600 hover:from-blue-600 hover:to-red-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

                                    {/* Security Section */}
                                    {activeSection === 'security' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                {mfaEnabled ? (
                                                    <ShieldCheck size={24} className="text-emerald-500" />
                                                ) : (
                                                    <Shield size={24} className="text-gray-400" />
                                                )}
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Security</h2>
                                            </div>

                                            {/* 2FA Status Card */}
                                            <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                                                <div className="p-4 border-b border-gray-200 dark:border-white/10">
                                                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        <KeyRound size={18} className="text-blue-500" />
                                                        Two-Factor Authentication
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-white/50 mt-1">Add an extra layer of security to your account using an authenticator app.</p>
                                                </div>

                                                <div className="p-4">
                                                    {mfaLoading ? (
                                                        <div className="flex items-center justify-center py-6">
                                                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                                        </div>
                                                    ) : mfaEnabled ? (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                                                <ShieldCheck size={20} className="text-emerald-500 flex-shrink-0" />
                                                                <div>
                                                                    <p className="font-medium text-emerald-700 dark:text-emerald-300 text-sm">2FA is Active</p>
                                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Your account is protected.</p>
                                                                </div>
                                                            </div>

                                                            {!showDisableForm ? (
                                                                <button
                                                                    onClick={() => setShowDisableForm(true)}
                                                                    className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 font-medium hover:underline transition"
                                                                >
                                                                    Disable 2FA
                                                                </button>
                                                            ) : (
                                                                <form onSubmit={handleDisableMfa} className="space-y-3 p-3 bg-red-500/5 rounded-xl border border-red-500/20">
                                                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Enter your authenticator code to confirm:</p>
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            pattern="[0-9]*"
                                                                            maxLength={6}
                                                                            value={disableToken}
                                                                            onChange={(e) => {
                                                                                setDisableToken(e.target.value.replace(/\D/g, ''));
                                                                                setDisableError('');
                                                                            }}
                                                                            placeholder="000000"
                                                                            className="flex-1 px-3 py-2 text-center font-mono tracking-[0.3em] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                                                        />
                                                                        <button
                                                                            type="submit"
                                                                            disabled={disabling || disableToken.length !== 6}
                                                                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-600 transition"
                                                                        >
                                                                            {disabling ? <Loader2 size={16} className="animate-spin" /> : 'Disable'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setShowDisableForm(false); setDisableToken(''); setDisableError(''); }}
                                                                            className="px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-white/50 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                    {disableError && (
                                                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                                                            <AlertCircle size={14} /> {disableError}
                                                                        </p>
                                                                    )}
                                                                </form>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                                                <ShieldOff size={20} className="text-amber-500 flex-shrink-0" />
                                                                <div>
                                                                    <p className="font-medium text-amber-700 dark:text-amber-300 text-sm">2FA is Not Enabled</p>
                                                                    <p className="text-xs text-amber-600 dark:text-amber-400">Your account could be more secure.</p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => setShowMfaSetup(true)}
                                                                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                                            >
                                                                <Shield size={18} />
                                                                Enable Two-Factor Authentication
                                                            </button>

                                                            <div className="text-xs text-gray-500 dark:text-white/40 space-y-1.5 px-1">
                                                                <p>1. Scan a QR code with Google Authenticator or Authy</p>
                                                                <p>2. Enter a 6-digit code to verify</p>
                                                                <p>3. Every login will require a code from your app</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Appearance Section */}
                                    {activeSection === 'appearance' && (
                                        <div className="space-y-8">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Appearance</h2>

                                            {/* Theme Toggle */}
                                            <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                                                <div className="p-4 border-b border-gray-200 dark:border-white/10">
                                                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        {theme === 'dark' ? <Moon size={18} className="text-red-500 dark:text-red-400" /> : <Sun size={18} className="text-amber-500 dark:text-amber-400" />}
                                                        Theme Preference
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-white/50 mt-1">Choose how UPTM Scheduling looks for you.</p>
                                                </div>
                                                <div className="p-4 flex gap-4">
                                                    <button
                                                        onClick={() => theme === 'dark' && toggleTheme()}
                                                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border ${theme === 'light'
                                                            ? 'bg-white text-blue-600 border-blue-200 shadow-md transform scale-[1.02]'
                                                            : 'bg-transparent text-gray-500 hover:bg-gray-200/50 dark:text-white/60 dark:border-white/5 dark:hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <Sun size={16} /> Light Mode
                                                    </button>
                                                    <button
                                                        onClick={() => theme === 'light' && toggleTheme()}
                                                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border ${theme === 'dark'
                                                            ? 'bg-blue-500/20 text-white border-blue-500/50 shadow-lg shadow-blue-500/10 transform scale-[1.02]'
                                                            : 'bg-transparent text-gray-500 hover:bg-gray-200/50 dark:text-white/60 dark:border-white/5 dark:hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <Moon size={16} /> Dark Mode
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Accent Color */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Palette size={18} className="text-rose-500 dark:text-rose-400" />
                                                    <h3 className="font-medium text-gray-900 dark:text-white">Accent Color</h3>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    {Object.entries(accentColors || ACCENT_COLORS).map(([key, color]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => setAccentColor(key)}
                                                            className={`group relative p-3 rounded-xl border transition-all ${accentColor === key
                                                                ? 'border-gray-300 dark:border-white/40 bg-white dark:bg-white/5 shadow-lg scale-105'
                                                                : 'border-transparent bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                                                                }`}
                                                        >
                                                            <div className={`w-full aspect-video rounded-lg bg-gradient-to-br ${color.gradient} shadow-sm group-hover:scale-105 transition-transform duration-200`} />
                                                            <p className="text-xs font-medium text-gray-600 dark:text-white/70 mt-3 text-center capitalize">
                                                                {color.name}
                                                            </p>
                                                            {accentColor === key && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    className="absolute top-2 right-2 w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-lg"
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

    return (
        <>
            {modal}
            {showMfaSetup && (
                <MFASetupModal
                    onClose={() => setShowMfaSetup(false)}
                    onEnabled={() => {
                        setMfaEnabled(true);
                        setShowMfaSetup(false);
                    }}
                />
            )}
        </>
    );
};

export default SettingsModal;
