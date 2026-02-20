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
    KeyRound
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
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
                    className="bg-white rounded-2xl shadow-xl p-8 dark:bg-gray-800"
                >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h2>
                            <p className="text-gray-500 dark:text-gray-400">Configure your academic information</p>
                        </div>
                    </div>

                    {/* Message */}
                    {message.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                        >
                            {message.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            )}
                            <span>{message.text}</span>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Email (Read-only) */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Mail className="w-4 h-4" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            />
                        </div>

                        {/* Student Name */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <IdCard className="w-4 h-4" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={profile.student_name}
                                onChange={(e) => setProfile({ ...profile, student_name: e.target.value })}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition dark:text-white"
                            />
                        </div>

                        {/* Programme */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <GraduationCap className="w-4 h-4" />
                                Programme
                            </label>
                            <select
                                value={profile.programme}
                                onChange={(e) => {
                                    setProfile({ ...profile, programme: e.target.value, semester: '' });
                                }}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition dark:text-white"
                            >
                                <option value="">Select your programme</option>
                                {PROGRAMMES.map(prog => (
                                    <option key={prog.code} value={prog.code}>
                                        {prog.code} - {prog.name}
                                    </option>
                                ))}
                            </select>
                            {selectedProgramme && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    {selectedProgramme.type === 'diploma' ? 'Diploma Programme (6 semesters)' : 'Degree Programme (8 semesters)'}
                                </p>
                            )}
                        </div>

                        {/* Semester */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Calendar className="w-4 h-4" />
                                Current Semester
                            </label>
                            <select
                                value={profile.semester}
                                onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                                disabled={!profile.programme}
                                className={`w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition dark:text-white ${!profile.programme ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                <option value="">Select your semester</option>
                                {[...Array(maxSemester)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        Semester {i + 1}
                                    </option>
                                ))}
                            </select>
                            {!profile.programme && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Please select a programme first
                                </p>
                            )}
                        </div>

                        {/* Save Button */}
                        <motion.button
                            type="submit"
                            disabled={saving}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 transition ${saving ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Changes
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Info Box */}
                    <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Why is this important?</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
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
                    className="bg-white rounded-2xl shadow-xl p-8 dark:bg-gray-800"
                >
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                        <div className={`w-16 h-16 bg-gradient-to-br ${mfaEnabled ? 'from-emerald-500 to-teal-600' : 'from-gray-400 to-gray-500'} rounded-2xl flex items-center justify-center shadow-lg transition-all`}>
                            {mfaEnabled ? (
                                <ShieldCheck className="w-8 h-8 text-white" />
                            ) : (
                                <Shield className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security</h2>
                            <p className="text-gray-500 dark:text-gray-400">Two-Factor Authentication (2FA)</p>
                        </div>
                    </div>

                    {mfaLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : mfaEnabled ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
                                <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-emerald-800 dark:text-emerald-300">2FA is Enabled</p>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Your account is protected with two-factor authentication.</p>
                                </div>
                            </div>

                            {!showDisableForm ? (
                                <button
                                    onClick={() => setShowDisableForm(true)}
                                    className="px-5 py-2.5 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium text-sm"
                                >
                                    Disable 2FA
                                </button>
                            ) : (
                                <form onSubmit={handleDisableMfa} className="space-y-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">Enter your authenticator code to disable 2FA:</p>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                                                className="w-full pl-9 pr-4 py-2.5 text-center font-mono tracking-[0.3em] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={disabling || disableToken.length !== 6}
                                            className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-red-700 transition text-sm"
                                        >
                                            {disabling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowDisableForm(false); setDisableToken(''); setDisableError(''); }}
                                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {disableError && (
                                        <p className="text-sm text-red-600 flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            {disableError}
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                                <ShieldOff className="w-6 h-6 text-amber-600 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-amber-800 dark:text-amber-300">2FA is Not Enabled</p>
                                    <p className="text-sm text-amber-600 dark:text-amber-400">Add an extra layer of security to your account.</p>
                                </div>
                            </div>

                            <motion.button
                                onClick={() => setShowMfaSetup(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
                            >
                                <Shield className="w-5 h-5" />
                                Enable Two-Factor Authentication
                            </motion.button>

                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">How it works</h4>
                                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    <li>1. Scan a QR code with Google Authenticator or Authy</li>
                                    <li>2. Enter a 6-digit code to verify</li>
                                    <li>3. Every login will require a code from your app</li>
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
                    className="bg-white rounded-2xl shadow-xl p-8 dark:bg-gray-800"
                >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                        <div className={`w-16 h-16 bg-gradient-to-br ${accentColors[accentColor].gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                            <Palette className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Theme Customization</h2>
                            <p className="text-gray-500 dark:text-gray-400">Personalize your dashboard appearance</p>
                        </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="mb-8">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            Display Mode
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => theme === 'dark' && toggleTheme()}
                                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${theme === 'light'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                    }`}
                            >
                                <Sun className="w-5 h-5" />
                                <span className="font-medium">Light</span>
                                {theme === 'light' && <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => theme === 'light' && toggleTheme()}
                                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${theme === 'dark'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                    }`}
                            >
                                <Moon className="w-5 h-5" />
                                <span className="font-medium">Dark</span>
                                {theme === 'dark' && <Check className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Accent Color Picker */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                            <Palette className="w-4 h-4" />
                            Accent Color
                        </label>
                        <div className="grid grid-cols-4 gap-3">
                            {Object.entries(accentColors).map(([key, color]) => (
                                <motion.button
                                    key={key}
                                    onClick={() => setAccentColor(key)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`relative p-4 rounded-xl border-2 transition-all ${accentColor === key
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
                                            className="absolute top-2 right-2 w-5 h-5 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow"
                                        >
                                            <Check className="w-3 h-3 text-gray-900 dark:text-white" />
                                        </motion.div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Preview</p>
                        <div className="flex items-center gap-3">
                            <div className={`px-4 py-2 bg-gradient-to-r ${accentColors[accentColor].gradient} text-white rounded-lg font-medium shadow-md`}>
                                Primary Button
                            </div>
                            <div className={`px-4 py-2 ${accentColors[accentColor].bg} text-white rounded-lg font-medium`}>
                                Accent
                            </div>
                            <div className={`px-4 py-2 border-2 border-current ${accentColors[accentColor].text} rounded-lg font-medium`}>
                                Outline
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}

