import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ACCENT_COLORS } from '../context/ThemeContext';
import {
    User,
    Save,
    GraduationCap,
    Calendar,
    Mail,
    IdCard,
    CheckCircle,
    AlertCircle,
    Palette,
    Sun,
    Moon,
    Check,
    Shield,
    ShieldCheck,
    ShieldOff,
    Loader2,
    KeyRound,
    Hash
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import MFASetupModal from '../components/MFASetupModal';

// Programme options
const PROGRAMMES = [
    { code: 'CT206', name: 'Bachelor of Information Technology (Honours) In Cyber Security', type: 'degree' },
    { code: 'CT204', name: 'Bachelor of Information Technology (Honours) in Computer Application Development', type: 'degree' },
    { code: 'CC101', name: 'Diploma in Computer Science', type: 'diploma' }
];

export default function StudentSettings() {
    const { user } = useAuth();
    const { theme, toggleTheme, accentColor, setAccentColor, accentColors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        student_name: '',
        programme: '',
        semester: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaLoading, setMfaLoading] = useState(true);
    const [disableToken, setDisableToken] = useState('');
    const [disableError, setDisableError] = useState('');
    const [disabling, setDisabling] = useState(false);
    const [showDisableForm, setShowDisableForm] = useState(false);

    useEffect(() => {
        loadProfile();
        loadMfaStatus();
    }, []);

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
            setMessage({ type: 'success', text: 'Two-factor authentication disabled.' });
        } catch (err) {
            setDisableError(err.response?.data?.message || 'Invalid code');
        } finally {
            setDisabling(false);
        }
    };

    const loadProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/student/profile');
            const data = response.data.data;
            setProfile({
                student_name: data.student_name || '',
                programme: data.programme || '',
                semester: data.semester || ''
            });
        } catch (error) {
            console.error('Failed to load profile:', error);
            setMessage({ type: 'error', text: 'Failed to load profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
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

            // Reload page after short delay to refresh user data
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

    if (loading) {
        return (
            <DashboardLayout role="student" title="Settings" activeTab="settings" onTabChange={() => { }}>
                <div className="flex items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="student" title="Settings" activeTab="settings" onTabChange={() => { }}>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Profile Settings Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8"
                >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-gray-900">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Profile Settings</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Configure your academic information</p>
                        </div>
                    </div>

                    {/* Message */}
                    {message.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-4 rounded-lg flex items-center gap-3 border ${message.type === 'success'
                                ? 'bg-green-50/50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-900/50 dark:text-green-400'
                                : 'bg-red-50/50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-900/50 dark:text-red-400'
                                }`}
                        >
                            {message.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium">{message.text}</span>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Student ID (Read-only) */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                                    <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Student ID
                                    </label>
                                    <div className="flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-white truncate">
                                        <Hash className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate font-mono tracking-tight">{user?.student_id || user?.studentId || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Email (Read-only) */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                                    <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Email Address
                                    </label>
                                    <div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                                        <Mail className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{user?.email || ''}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Student Name (Read-only) */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                                    Full Name
                                </label>
                                <div className="flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-white truncate">
                                    <IdCard className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{profile.student_name || user?.studentName || ''}</span>
                                </div>
                            </div>
                        </div>

                        {/* Programme */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                <GraduationCap className="w-4 h-4" />
                                Programme
                            </label>
                            <select
                                value={profile.programme}
                                onChange={(e) => {
                                    setProfile({ ...profile, programme: e.target.value, semester: '' });
                                }}
                                className="w-full px-4 py-3 bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white transition-colors focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white appearance-none"
                            >
                                <option value="" className="text-gray-500">Select your programme...</option>
                                {PROGRAMMES.map(prog => (
                                    <option key={prog.code} value={prog.code} className="text-black dark:text-white bg-white dark:bg-[#0b0c10]">
                                        {prog.code} - {prog.name}
                                    </option>
                                ))}
                            </select>
                            {selectedProgramme && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                                    {selectedProgramme.type === 'diploma' ? 'Diploma Programme (6 semesters)' : 'Degree Programme (8 semesters)'}
                                </p>
                            )}
                        </div>

                        {/* Semester */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                <Calendar className="w-4 h-4" />
                                Current Semester
                            </label>
                            <select
                                value={profile.semester}
                                onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                                disabled={!profile.programme}
                                className={`w-full px-4 py-3 bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white transition-colors focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white appearance-none ${!profile.programme ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900/50' : ''}`}
                            >
                                <option value="" className="text-gray-500">Select your semester...</option>
                                {[...Array(maxSemester)].map((_, i) => (
                                    <option key={i + 1} value={i + 1} className="text-black dark:text-white bg-white dark:bg-[#0b0c10]">
                                        Semester {i + 1}
                                    </option>
                                ))}
                            </select>
                            {!profile.programme && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                                    Please select a programme first
                                </p>
                            )}
                        </div>

                        {/* Save Button */}
                        <div className="pt-2">
                            <motion.button
                                type="submit"
                                disabled={saving}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-transparent 
                                           bg-gray-900 text-white hover:bg-black 
                                           dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200
                                           ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </form>

                    {/* Info Box */}
                    <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-xl">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 tracking-wide uppercase">Why is this important?</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your programme and semester determine which subjects you can register for.
                            Make sure to select the correct information to see relevant courses.
                        </p>
                    </div>
                </motion.div>

                {/* Security / 2FA Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8"
                >
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-gray-900">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                            {mfaEnabled ? (
                                <ShieldCheck className="w-8 h-8 text-gray-900 dark:text-white" />
                            ) : (
                                <Shield className="w-8 h-8 text-gray-900 dark:text-white" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Security Settings</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Two-Factor Authentication (2FA)</p>
                        </div>
                    </div>

                    {mfaLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-gray-900 dark:text-white animate-spin" />
                        </div>
                    ) : mfaEnabled ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800">
                                <ShieldCheck className="w-6 h-6 text-gray-900 dark:text-white flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">2FA is Enabled</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Your account is protected with an authenticator app.</p>
                                </div>
                            </div>

                            {!showDisableForm ? (
                                <button
                                    onClick={() => setShowDisableForm(true)}
                                    className="px-5 py-2.5 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors font-bold text-sm"
                                >
                                    Disable 2FA
                                </button>
                            ) : (
                                <form onSubmit={handleDisableMfa} className="space-y-4 p-5 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800">
                                    <p className="text-sm text-gray-900 dark:text-white font-bold">Enter your authenticator code to disable 2FA:</p>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
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
                                                className="w-full pl-9 pr-4 py-2.5 text-center font-mono tracking-[0.3em] bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-colors"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={disabling || disableToken.length !== 6}
                                            className="px-5 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 rounded-lg font-bold disabled:opacity-50 transition-colors text-sm"
                                        >
                                            {disabling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowDisableForm(false); setDisableToken(''); setDisableError(''); }}
                                            className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {disableError && (
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 mt-2">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            {disableError}
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800">
                                <ShieldOff className="w-6 h-6 text-gray-900 dark:text-white flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">2FA is Not Enabled</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of structural security to your account.</p>
                                </div>
                            </div>

                            <motion.button
                                onClick={() => setShowMfaSetup(true)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-transparent"
                            >
                                <Shield className="w-5 h-5" />
                                Enable Two-Factor Authentication
                            </motion.button>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-xl">
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 tracking-wide uppercase">How it works</h4>
                                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-disc pl-4 marker:text-gray-400">
                                    <li>Scan a QR code with an Authenticator app (Google/Authy)</li>
                                    <li>Enter the 6-digit code to verify</li>
                                    <li>Every login will subsequently require a time-based code</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* MFA Setup Modal */}
                {showMfaSetup && (
                    <MFASetupModal
                        onClose={() => setShowMfaSetup(false)}
                        onEnabled={() => {
                            setMfaEnabled(true);
                            setMessage({ type: 'success', text: 'Two-factor authentication enabled!' });
                        }}
                    />
                )}

                {/* Theme Customization Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8"
                >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-gray-900">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                            <Palette className="w-8 h-8 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Theme Customization</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Personalize your dashboard appearance</p>
                        </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="mb-8">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            Display Mode
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => theme === 'dark' && toggleTheme()}
                                className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${theme === 'light'
                                    ? 'border-gray-900 bg-gray-50 text-gray-900 dark:border-white dark:bg-gray-800 dark:text-white'
                                    : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                                    }`}
                            >
                                <Sun className="w-4 h-4" />
                                <span className="text-sm font-bold">Light</span>
                                {theme === 'light' && <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => theme === 'light' && toggleTheme()}
                                className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${theme === 'dark'
                                    ? 'border-gray-900 bg-gray-50 text-gray-900 dark:border-white dark:bg-[#1a1c23] dark:text-white'
                                    : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                                    }`}
                            >
                                <Moon className="w-4 h-4" />
                                <span className="text-sm font-bold">Dark</span>
                                {theme === 'dark' && <Check className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Accent Color Picker */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                            <Palette className="w-4 h-4" />
                            Highlight Color
                        </label>
                        <div className="grid grid-cols-4 gap-3">
                            {Object.entries(accentColors).map(([key, color]) => (
                                <button
                                    key={key}
                                    onClick={() => setAccentColor(key)}
                                    className={`relative p-3 rounded-xl border transition-all active:scale-[0.98] ${accentColor === key
                                        ? 'border-gray-900 dark:border-white'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                >
                                    <div className={`w-full aspect-square rounded-lg ${color.bg}`} />
                                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mt-2 text-center">
                                        {color.name}
                                    </p>
                                    {accentColor === key && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-gray-900 dark:text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-xl">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 tracking-wider uppercase">Preview Match</p>
                        <div className="flex items-center gap-3">
                            <div className={`px-4 py-2 ${accentColors[accentColor].bg} text-white rounded-lg font-bold text-sm`}>
                                Primary Box
                            </div>
                            <div className={`px-4 py-2 bg-transparent text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg font-bold text-sm ${accentColors[accentColor].text}`}>
                                Accent Text
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
