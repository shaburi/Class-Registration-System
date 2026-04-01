import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, User, Mail, IdCard, BookOpen, Calendar, CalendarDays, Rocket, AlertCircle, Check } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { resetTutorial } from '../components/OnboardingTutorial';
import api from '../services/api';

// Programme options
const PROGRAMMES = [
    { code: 'CT206', name: 'Bachelor of IT (Honours) In Cyber Security', type: 'degree' },
    { code: 'CT204', name: 'Bachelor of IT (Honours) In Computer Application Development', type: 'degree' },
    { code: 'CC101', name: 'Diploma in Computer Science', type: 'diploma' }
];

// Generate intake sessions
const generateIntakeSessions = () => {
    const year = new Date().getFullYear();
    const sessions = [];
    for (let y = year - 3; y <= year + 1; y++) {
        const yy = String(y).slice(-2);
        sessions.push(
            { code: `05${yy}`, name: `May ${y}` },
            { code: `08${yy}`, name: `August ${y}` },
            { code: `12${yy}`, name: `December ${y}` }
        );
    }
    return sessions.sort((a, b) => {
        const ya = parseInt(a.code.slice(-2)), yb = parseInt(b.code.slice(-2));
        if (yb !== ya) return yb - ya;
        return parseInt(b.code.slice(0, 2)) - parseInt(a.code.slice(0, 2));
    });
};

const INTAKE_SESSIONS = generateIntakeSessions();

// Derive student ID from email prefix
const deriveStudentId = (email) => {
    if (!email) return '';
    const prefix = email.split('@')[0]?.toUpperCase() || '';
    // Replace common email prefixes with actual ID prefix
    return prefix;
};

export default function StudentOnboarding() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        student_id: '',
        programme: '',
        semester: '',
        intake_session: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0); // 0 = welcome, 1 = form

    // Pre-fill student ID from email
    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({
                ...prev,
                student_id: deriveStudentId(user.email),
            }));
        }
    }, [user]);

    // If already completed, redirect to dashboard
    useEffect(() => {
        if (user?.profile_completed) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const maxSemesters = PROGRAMMES.find(p => p.code === formData.programme)?.type === 'diploma' ? 6 : 8;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.student_id.trim()) {
            setError('Please enter your Student ID');
            return;
        }
        if (!formData.programme) {
            setError('Please select your programme');
            return;
        }
        if (!formData.semester) {
            setError('Please select your current semester');
            return;
        }

        setLoading(true);
        try {
            const response = await api.put('/student/profile', {
                student_id: formData.student_id.trim(),
                student_name: user?.student_name || user?.studentName || user?.displayName || '',
                programme: formData.programme,
                semester: parseInt(formData.semester),
                intake_session: formData.intake_session || undefined,
            });

            if (response.data?.data) {
                setUser(prev => ({
                    ...prev,
                    ...response.data.data,
                    profile_completed: true,
                }));
            }

            // Reset tutorial so it shows on first dashboard visit after onboarding
            resetTutorial();

            navigate('/dashboard', { replace: true });
        } catch (err) {
            console.error('Profile setup error:', err);
            setError(err.response?.data?.message || 'Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const displayName = user?.student_name || user?.studentName || user?.displayName || user?.email?.split('@')[0] || 'Student';
    const profilePhoto = user?.photoURL || user?.picture || null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#07090e] p-4 relative font-body transition-colors duration-500">
            {/* Theme toggle */}
            <div className="absolute top-6 right-6 z-20">
                <div className="p-1 rounded-full bg-white dark:bg-[#11131e] border border-gray-200 dark:border-gray-800 shadow-sm">
                    <ThemeToggle />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[520px] relative z-10"
            >
                {/* Logo and Title */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                        className="inline-block mb-6 relative"
                    >
                        <div className="w-16 h-16 bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg">
                            <GraduationCap className="w-8 h-8 text-white dark:text-gray-900" />
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-3xl md:text-3xl font-heading font-black text-gray-900 dark:text-white mb-2 leading-tight tracking-tight"
                    >
                        Setup Your Profile
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-500 dark:text-gray-400 text-sm"
                    >
                        Let's get you set up before we dive in, <span className="font-semibold text-gray-700 dark:text-gray-300">{displayName}</span>
                    </motion.p>
                </div>

                {/* Form Card */}
                <AnimatePresence mode="wait">
                    {currentStep === 0 ? (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="rounded-2xl p-8 sm:p-10 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 shadow-xl">
                                <div className="text-center space-y-8">
                                    {/* Profile Preview */}
                                    <div className="flex flex-col items-center gap-5">
                                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-900 dark:text-gray-100 text-3xl font-bold overflow-hidden border border-gray-200 dark:border-gray-800">
                                            {profilePhoto ? (
                                                <img src={profilePhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                displayName.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user?.email}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-5 text-left">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-center">
                                            We just need a few academic details — your student ID, programme, and current semester.
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="w-full flex items-center justify-center gap-2 py-4 shadow-lg rounded-lg font-bold transition-all
                                                   bg-gray-900 text-white hover:bg-black
                                                   dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                                    >
                                        <Rocket className="w-5 h-5" />
                                        Complete Profile
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="rounded-2xl p-8 sm:p-10 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 shadow-xl">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 font-heading flex items-center gap-2">
                                    Academic Details
                                </h2>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Email & Name (read-only) group */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-800">
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider block mb-1">Email</label>
                                            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-300 text-sm">
                                                <Mail size={14} className="text-gray-400" />
                                                <span className="truncate">{user?.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-800">
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider block mb-1">Name</label>
                                            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-300 text-sm">
                                                <User size={14} className="text-gray-400" />
                                                <span className="truncate">{displayName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student ID (editable) */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            Student ID
                                        </label>
                                        <div className="relative group/input">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <IdCard size={18} className="text-gray-400 dark:text-gray-600 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.student_id}
                                                onChange={(e) => setFormData({ ...formData, student_id: e.target.value.toUpperCase() })}
                                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-xl outline-none 
                                                           text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-colors
                                                           focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white
                                                           font-mono uppercase appearance-none"
                                                placeholder="e.g., AM2408016652"
                                                required
                                            />
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-500">
                                            Verify this matches your official UPTM ID exactly.
                                        </p>
                                    </div>

                                    {/* Programme */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            Programme
                                        </label>
                                        <div className="relative group/input">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <BookOpen size={18} className="text-gray-400 dark:text-gray-600 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
                                            </div>
                                            <select
                                                value={formData.programme}
                                                onChange={(e) => setFormData({ ...formData, programme: e.target.value, semester: '' })}
                                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-xl outline-none 
                                                           text-gray-900 dark:text-white transition-colors
                                                           focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white
                                                           appearance-none"
                                                required
                                            >
                                                <option value="" className="text-gray-500 dark:text-gray-400">Select...</option>
                                                {PROGRAMMES.map(p => (
                                                    <option key={p.code} value={p.code} className="bg-white dark:bg-gray-900 text-black dark:text-white">
                                                        {p.code} - {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Semester & Intake in a row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Semester */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                Semester
                                            </label>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Calendar size={16} className="text-gray-400 dark:text-gray-600 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
                                                </div>
                                                <select
                                                    value={formData.semester}
                                                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                                    disabled={!formData.programme}
                                                    className="w-full pl-9 pr-3 py-3 bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-xl outline-none 
                                                               text-gray-900 dark:text-white transition-colors text-sm
                                                               focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white
                                                               appearance-none disabled:opacity-50 disabled:bg-gray-50 disabled:dark:bg-gray-900/50"
                                                    required
                                                >
                                                    <option value="" className="text-gray-500 dark:text-gray-400">...</option>
                                                    {[...Array(maxSemesters)].map((_, i) => (
                                                        <option key={i + 1} value={i + 1} className="bg-white dark:bg-gray-900 text-black dark:text-white">
                                                            Semester {i + 1}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Intake Session */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                Intake (Optional)
                                            </label>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CalendarDays size={16} className="text-gray-400 dark:text-gray-600 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
                                                </div>
                                                <select
                                                    value={formData.intake_session}
                                                    onChange={(e) => setFormData({ ...formData, intake_session: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-3 bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-xl outline-none 
                                                               text-gray-900 dark:text-white transition-colors text-sm
                                                               focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white
                                                               appearance-none"
                                                >
                                                    <option value="" className="text-gray-500 dark:text-gray-400">...</option>
                                                    {INTAKE_SESSIONS.map(s => (
                                                        <option key={s.code} value={s.code} className="bg-white dark:bg-gray-900 text-black dark:text-white">
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full flex items-center justify-center gap-2 py-4 shadow-lg rounded-lg font-bold transition-all
                                                       bg-gray-900 text-white hover:bg-black
                                                       dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200
                                                       disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5" />
                                                    Finish Setup
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Step indicator */}
                <div className="flex justify-center gap-2 mt-8">
                    {[0, 1].map((step) => (
                        <div
                            key={step}
                            className={`h-1.5 rounded-full transition-all duration-300 ${step === currentStep
                                ? 'w-8 bg-gray-900 dark:bg-white'
                                : 'w-1.5 bg-gray-300 dark:bg-gray-800'
                                }`}
                        />
                    ))}
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="mt-8 text-center"
                >
                    <p className="text-gray-400 dark:text-gray-600 text-[10px] tracking-widest uppercase font-bold">
                        © {new Date().getFullYear()} UPTM FCOM · Profile Setup
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
