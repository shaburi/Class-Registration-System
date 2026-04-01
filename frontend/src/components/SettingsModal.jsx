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
    AlertCircle,
    RotateCcw,
    Hash
} from 'lucide-react';
import api from '../services/api';
import MFASetupModal from './MFASetupModal';
import { resetTutorial } from './OnboardingTutorial';

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

const SettingsModal = ({ isOpen, onClose, onReplayTutorial }) => {
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
                        className="fixed inset-0 bg-black/60 z-[9999]"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-[700px] h-[580px] bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex overflow-hidden pointer-events-auto"
                        >
                            {/* Left Sidebar */}
                            <div className="w-56 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                                {/* Close Button Header */}
                                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-2">Settings</span>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 rounded-lg bg-gray-200/50 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Navigation */}
                                <nav className="flex-1 p-3 space-y-1.5">
                                    {settingsNav.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === item.id
                                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white border border-transparent'
                                                }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>

                                {/* Logout Button */}
                                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-colors"
                                    >
                                        <LogOut size={18} />
                                        Log out
                                    </button>
                                </div>
                            </div>

                            {/* Right Content Area */}
                            <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0b0c10]">
                                <div className="p-8">
                                    {/* Profile Section */}
                                    {activeSection === 'profile' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Profile</h2>
                                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-900 dark:text-white font-bold">
                                                    {user?.student_name?.charAt(0) || 'U'}
                                                </div>
                                            </div>

                                            {/* Message */}
                                            {message.text && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold border ${message.type === 'success'
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                                        }`}
                                                >
                                                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                                                    {message.text}
                                                </motion.div>
                                            )}

                                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {/* Student ID (Read only) */}
                                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1 block">Student ID</label>
                                                            <div className="flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                <Hash size={16} className="text-gray-400 flex-shrink-0" />
                                                                <span className="truncate font-mono tracking-tight">{user?.student_id || user?.studentId || 'N/A'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Email (Read only) */}
                                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1 block">Email Address</label>
                                                            <div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                                                                <Mail size={16} className="text-gray-400 flex-shrink-0" />
                                                                <span className="truncate">{user?.email || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Name (Read only) */}
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1 block">Full Name</label>
                                                        <div className="flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            <IdCard size={16} className="text-gray-400 flex-shrink-0" />
                                                            <span className="truncate">{profile.student_name || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Programme */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider">Programme</label>
                                                    <div className="relative group/input">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <GraduationCap size={18} className="text-gray-400 dark:text-gray-600 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
                                                        </div>
                                                        <select
                                                            value={profile.programme}
                                                            onChange={(e) => setProfile({ ...profile, programme: e.target.value, semester: '' })}
                                                            className="block w-full rounded-xl bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 pl-10 pr-3 py-3 text-gray-900 dark:text-white focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-sm outline-none appearance-none"
                                                        >
                                                            <option value="" className="bg-white dark:bg-gray-900 text-gray-500">Select Programme...</option>
                                                            {PROGRAMMES.map(prog => (
                                                                <option key={prog.code} value={prog.code} className="bg-white dark:bg-gray-900 text-black dark:text-white">{prog.code} - {prog.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Semester */}
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider">Semester</label>
                                                        <div className="relative group/input">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <Calendar size={18} className="text-gray-400 dark:text-gray-600 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
                                                            </div>
                                                            <select
                                                                value={profile.semester}
                                                                onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                                                                disabled={!profile.programme}
                                                                className="block w-full rounded-xl bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 pl-10 pr-3 py-3 text-gray-900 dark:text-white focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-sm outline-none appearance-none disabled:bg-gray-50 disabled:dark:bg-gray-900/50 disabled:opacity-50"
                                                            >
                                                                <option value="" className="bg-white dark:bg-gray-900 text-gray-500">...</option>
                                                                {[...Array(maxSemester)].map((_, i) => (
                                                                    <option key={i + 1} value={i + 1} className="bg-white dark:bg-gray-900 text-black dark:text-white">Semester {i + 1}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Intake Session */}
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider">Intake</label>
                                                        <div className="relative group/input">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <Calendar size={18} className="text-gray-400 dark:text-gray-600 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
                                                            </div>
                                                            <select
                                                                value={profile.intake_session}
                                                                onChange={(e) => setProfile({ ...profile, intake_session: e.target.value })}
                                                                className="block w-full rounded-xl bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 pl-10 pr-3 py-3 text-gray-900 dark:text-white focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-sm outline-none appearance-none"
                                                            >
                                                                <option value="" className="bg-white dark:bg-gray-900 text-gray-500">Select...</option>
                                                                {INTAKE_SESSIONS.map(session => (
                                                                    <option key={session.code} value={session.code} className="bg-white dark:bg-gray-900 text-black dark:text-white">
                                                                        {session.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Save Button */}
                                                <div className="pt-2">
                                                    <button
                                                        type="submit"
                                                        disabled={saving}
                                                        className="w-full py-3 px-4 bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save size={18} />
                                                                Save Changes
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
                                                    <ShieldCheck size={24} className="text-gray-900 dark:text-white" />
                                                ) : (
                                                    <Shield size={24} className="text-gray-500 dark:text-gray-400" />
                                                )}
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Security</h2>
                                            </div>

                                            {/* 2FA Status Card */}
                                            <div className="bg-white dark:bg-[#0b0c10] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                                                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <KeyRound size={16} className="text-gray-500" />
                                                        Two-Factor Authentication
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add an extra layer of security to your account.</p>
                                                </div>

                                                <div className="p-5">
                                                    {mfaLoading ? (
                                                        <div className="flex items-center justify-center py-6">
                                                            <Loader2 className="w-6 h-6 text-gray-900 dark:text-white animate-spin" />
                                                        </div>
                                                    ) : mfaEnabled ? (
                                                        <div className="space-y-5">
                                                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                                                                <ShieldCheck size={20} className="text-gray-900 dark:text-white flex-shrink-0" />
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">2FA is Active</p>
                                                                    <p className="text-xs text-gray-500 max-w-sm mt-0.5">Your account is fully structural and secure.</p>
                                                                </div>
                                                            </div>

                                                            {!showDisableForm ? (
                                                                <button
                                                                    onClick={() => setShowDisableForm(true)}
                                                                    className="px-5 py-2.5 bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 font-bold rounded-xl text-sm transition-colors"
                                                                >
                                                                    Disable 2FA
                                                                </button>
                                                            ) : (
                                                                <form onSubmit={handleDisableMfa} className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                                                                    <p className="text-sm text-gray-900 dark:text-white font-bold">Enter your authenticator code to confirm disable:</p>
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
                                                                            className="flex-1 px-4 py-2.5 text-center font-mono tracking-[0.3em] bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black text-sm transition-colors"
                                                                        />
                                                                        <button
                                                                            type="submit"
                                                                            disabled={disabling || disableToken.length !== 6}
                                                                            className="px-5 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-black dark:hover:bg-gray-200 transition-colors"
                                                                        >
                                                                            {disabling ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setShowDisableForm(false); setDisableToken(''); setDisableError(''); }}
                                                                            className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                    {disableError && (
                                                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 mt-2">
                                                                            <AlertCircle size={14} /> {disableError}
                                                                        </p>
                                                                    )}
                                                                </form>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                                                                <ShieldOff size={20} className="text-gray-900 dark:text-white flex-shrink-0" />
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">2FA is Not Enabled</p>
                                                                    <p className="text-xs text-gray-500 mt-0.5">Your account could be more secure.</p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => setShowMfaSetup(true)}
                                                                className="w-full py-3.5 px-4 bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                                                            >
                                                                <Shield size={18} />
                                                                Enable Two-Factor Authentication
                                                            </button>

                                                            <div className="text-xs font-medium text-gray-500 space-y-2 px-1">
                                                                <p className="flex gap-2"><span className="text-gray-900 dark:text-white font-bold">1.</span> Scan a QR code with an Authenticator app</p>
                                                                <p className="flex gap-2"><span className="text-gray-900 dark:text-white font-bold">2.</span> Enter a 6-digit code to verify</p>
                                                                <p className="flex gap-2"><span className="text-gray-900 dark:text-white font-bold">3.</span> Every login will require a generated code</p>
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
                                            <div className="bg-white dark:bg-[#0b0c10] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                                                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        {theme === 'dark' ? <Moon size={16} className="text-gray-500" /> : <Sun size={16} className="text-gray-500" />}
                                                        Display Mode
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose how UPTM Scheduling looks for you.</p>
                                                </div>
                                                <div className="p-5 flex gap-4">
                                                    <button
                                                        onClick={() => theme === 'dark' && toggleTheme()}
                                                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border ${theme === 'light'
                                                            ? 'border-gray-900 bg-gray-50 text-gray-900 dark:border-white dark:bg-gray-800 dark:text-white'
                                                            : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                                                            }`}
                                                    >
                                                        <Sun size={16} /> Light
                                                    </button>
                                                    <button
                                                        onClick={() => theme === 'light' && toggleTheme()}
                                                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border ${theme === 'dark'
                                                            ? 'border-gray-900 bg-gray-50 text-gray-900 dark:border-white dark:bg-[#1a1c23] dark:text-white'
                                                            : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                                                            }`}
                                                    >
                                                        <Moon size={16} /> Dark
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Accent Color */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Palette size={18} className="text-gray-500 dark:text-gray-400" />
                                                    <h3 className="font-bold text-gray-900 dark:text-white">Accent Highlight</h3>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    {Object.entries(accentColors || ACCENT_COLORS).map(([key, color]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => setAccentColor(key)}
                                                            className={`group relative p-3 rounded-xl border transition-all active:scale-[0.98] ${accentColor === key
                                                                ? 'border-gray-900 dark:border-white bg-white dark:bg-[#0b0c10] shadow-sm'
                                                                : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700'
                                                                }`}
                                                        >
                                                            <div className={`w-full aspect-video rounded-lg ${color.bg} shadow-sm border border-black/5 dark:border-white/5 transition-transform duration-200`} />
                                                            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mt-3 text-center capitalize tracking-wider uppercase">
                                                                {color.name}
                                                            </p>
                                                            {accentColor === key && (
                                                                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm">
                                                                    <Check size={10} strokeWidth={4} className="text-gray-900 dark:text-white" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Replay Tutorial */}
                                            {onReplayTutorial && (
                                                <div className="bg-white dark:bg-[#0b0c10] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm mt-8">
                                                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                            <RotateCcw size={16} className="text-gray-500" />
                                                            Onboarding Tutorial
                                                        </h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Replay the guided tour to learn about all dashboard features.</p>
                                                    </div>
                                                    <div className="p-5">
                                                        <button
                                                            onClick={() => {
                                                                resetTutorial();
                                                                onClose();
                                                                onReplayTutorial();
                                                            }}
                                                            className="px-5 py-3 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors active:scale-[0.98]"
                                                        >
                                                            <RotateCcw size={16} />
                                                            Replay Walkthrough
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
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
