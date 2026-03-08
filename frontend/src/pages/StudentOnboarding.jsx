import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Sparkles, User, Mail, IdCard, BookOpen, Calendar, CalendarDays, Rocket, AlertCircle, Check } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import TiltCard from '../components/TiltCard';
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
    // KL -> AM is a known pattern, but keep it editable for students to fix
    return prefix;
};

// Decorative background glows
const BackgroundGlows = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.15, 0.25, 0.15],
                rotate: [0, 90, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-blue-600/30 to-red-600/10 blur-[120px]"
        />
        <motion.div
            animate={{
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.15, 0.1],
                x: [0, -100, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-red-600/20 to-blue-600/20 blur-[100px]"
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMSkiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay"></div>
    </div>
);

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#07090e] p-4 relative overflow-hidden font-body selection:bg-blue-500/30 selection:text-white transition-colors duration-500">
            <BackgroundGlows />

            {/* Theme toggle */}
            <div className="absolute top-6 right-6 z-20">
                <div className="p-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md shadow-lg dark:shadow-2xl">
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
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, rotateX: 45 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                        className="inline-block mb-5 relative"
                    >
                        <TiltCard>
                            <div className="w-18 h-18 bg-gradient-to-b from-blue-600 to-[#1e3a8a] rounded-[1.25rem] flex items-center justify-center 
                                          shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5),inset_0_2px_0_0_rgba(255,255,255,0.2)] 
                                          ring-1 ring-white/10 p-4">
                                <GraduationCap className="w-9 h-9 text-white drop-shadow-md" />
                            </div>
                        </TiltCard>
                        <motion.div
                            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-2 -right-2"
                        >
                            <Sparkles className="w-6 h-6 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)]" />
                        </motion.div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-3xl md:text-4xl font-heading font-black text-gray-900 dark:text-white mb-2 leading-tight tracking-tight"
                    >
                        Setup Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-red-500 to-blue-500 animate-gradient-x">Profile</span>
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

                {/* Glass Card */}
                <AnimatePresence mode="wait">
                    {currentStep === 0 ? (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <TiltCard>
                                <div className="relative rounded-[2rem] p-8 sm:p-10 bg-white/80 dark:bg-[#11131e]/80 backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)_inset] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)_inset]">
                                    <div className="absolute inset-0 rounded-[2rem] border border-black/5 dark:border-white/5 pointer-events-none" />
                                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />

                                    <div className="text-center space-y-6">
                                        {/* Profile Preview */}
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-blue-500/20 overflow-hidden">
                                                {profilePhoto ? (
                                                    <img src={profilePhoto} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    displayName.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 text-left">
                                            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                                We just need a few details to personalize your experience — your student ID, programme, and semester.
                                            </p>
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setCurrentStep(1)}
                                            className="w-full relative group/btn overflow-hidden rounded-xl bg-blue-700 
                                                       border border-white/10 text-white font-bold tracking-wide py-3.5
                                                       shadow-[0_0_20px_-5px_rgba(59,130,246,0.5),inset_0_1px_0_0_rgba(255,255,255,0.2)]
                                                       hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.7),inset_0_1px_0_0_rgba(255,255,255,0.3)]
                                                       transition-all duration-300"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                            <div className="relative flex items-center justify-center gap-2">
                                                <Rocket className="w-5 h-5" />
                                                Let's Go!
                                            </div>
                                        </motion.button>
                                    </div>
                                </div>
                            </TiltCard>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="relative rounded-[2rem] p-8 sm:p-10 bg-white/80 dark:bg-[#11131e]/80 backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)_inset] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)_inset]">
                                <div className="absolute inset-0 rounded-[2rem] border border-black/5 dark:border-white/5 pointer-events-none" />
                                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />

                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 font-heading flex items-center gap-2">
                                    Complete Your Profile <span className="text-lg">📋</span>
                                </h2>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                <p className="text-red-400 text-sm font-medium">{error}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Email (read-only) */}
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3.5 border border-gray-200 dark:border-white/10">
                                        <label className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-0.5 block">Email</label>
                                        <div className="flex items-center gap-2.5 text-gray-700 dark:text-white/80 text-sm">
                                            <Mail size={16} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                            <span className="truncate">{user?.email || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* Name (read-only) */}
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3.5 border border-gray-200 dark:border-white/10">
                                        <label className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-0.5 block">Full Name</label>
                                        <div className="flex items-center gap-2.5 text-gray-700 dark:text-white/80 text-sm">
                                            <User size={16} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                            <span>{displayName}</span>
                                        </div>
                                    </div>

                                    {/* Student ID (editable) */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 dark:text-white/50 uppercase tracking-wider pl-1 font-heading">
                                            Student ID
                                        </label>
                                        <p className="text-[11px] text-gray-400 dark:text-white/30 pl-1">
                                            Pre-filled from your email. Edit if different (e.g., KL→AM prefix).
                                        </p>
                                        <div className="relative group/input">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <IdCard size={18} className="text-gray-400 dark:text-white/30 group-focus-within/input:text-blue-400 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.student_id}
                                                onChange={(e) => setFormData({ ...formData, student_id: e.target.value.toUpperCase() })}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none 
                                                           text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-all duration-300
                                                           focus:bg-blue-50 dark:focus:bg-blue-600/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                                                           shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
                                                           font-mono tracking-wider uppercase"
                                                placeholder="e.g., AM2408016652"
                                                required
                                            />
                                            <div className="absolute bottom-0 inset-x-4 h-[1px] bg-blue-500 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left opacity-50" />
                                        </div>
                                    </div>

                                    {/* Programme */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 dark:text-white/50 uppercase tracking-wider pl-1 font-heading">
                                            Programme
                                        </label>
                                        <div className="relative group/input">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <BookOpen size={18} className="text-gray-400 dark:text-white/30 group-focus-within/input:text-blue-400 transition-colors" />
                                            </div>
                                            <select
                                                value={formData.programme}
                                                onChange={(e) => setFormData({ ...formData, programme: e.target.value, semester: '' })}
                                                className="w-full pl-11 pr-4 py-3 bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none 
                                                           text-gray-900 dark:text-white transition-all duration-300
                                                           focus:bg-blue-50 dark:focus:bg-blue-600/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                                                           shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
                                                           appearance-none"
                                                required
                                            >
                                                <option value="" className="bg-white dark:bg-gray-900">Select Programme...</option>
                                                {PROGRAMMES.map(p => (
                                                    <option key={p.code} value={p.code} className="bg-white dark:bg-gray-900">
                                                        {p.code} - {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute bottom-0 inset-x-4 h-[1px] bg-blue-500 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left opacity-50" />
                                        </div>
                                    </div>

                                    {/* Semester & Intake in a row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Semester */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-400 dark:text-white/50 uppercase tracking-wider pl-1 font-heading">
                                                Semester
                                            </label>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Calendar size={16} className="text-gray-400 dark:text-white/30" />
                                                </div>
                                                <select
                                                    value={formData.semester}
                                                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                                    disabled={!formData.programme}
                                                    className="w-full pl-9 pr-3 py-3 bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none 
                                                               text-gray-900 dark:text-white transition-all duration-300 text-sm
                                                               focus:bg-blue-50 dark:focus:bg-blue-600/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                                                               shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
                                                               appearance-none disabled:opacity-50"
                                                    required
                                                >
                                                    <option value="" className="bg-white dark:bg-gray-900">Select...</option>
                                                    {[...Array(maxSemesters)].map((_, i) => (
                                                        <option key={i + 1} value={i + 1} className="bg-white dark:bg-gray-900">
                                                            Semester {i + 1}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Intake Session */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-400 dark:text-white/50 uppercase tracking-wider pl-1 font-heading">
                                                Intake
                                            </label>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CalendarDays size={16} className="text-gray-400 dark:text-white/30" />
                                                </div>
                                                <select
                                                    value={formData.intake_session}
                                                    onChange={(e) => setFormData({ ...formData, intake_session: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-3 bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none 
                                                               text-gray-900 dark:text-white transition-all duration-300 text-sm
                                                               focus:bg-blue-50 dark:focus:bg-blue-600/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                                                               shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
                                                               appearance-none"
                                                >
                                                    <option value="" className="bg-white dark:bg-gray-900">Optional...</option>
                                                    {INTAKE_SESSIONS.map(s => (
                                                        <option key={s.code} value={s.code} className="bg-white dark:bg-gray-900">
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <div className="pt-2">
                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            disabled={loading}
                                            className="w-full relative group/btn overflow-hidden rounded-xl bg-blue-700 
                                                       border border-white/10 text-white font-bold tracking-wide py-3.5
                                                       shadow-[0_0_20px_-5px_rgba(59,130,246,0.5),inset_0_1px_0_0_rgba(255,255,255,0.2)]
                                                       hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.7),inset_0_1px_0_0_rgba(255,255,255,0.3)]
                                                       transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                            <div className="relative flex items-center justify-center gap-2">
                                                {loading ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Setting Up...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-5 h-5" />
                                                        Complete Setup
                                                    </>
                                                )}
                                            </div>
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Step indicator */}
                <div className="flex justify-center gap-2 mt-6">
                    {[0, 1].map((step) => (
                        <div
                            key={step}
                            className={`h-1.5 rounded-full transition-all duration-300 ${step === currentStep
                                ? 'w-8 bg-blue-500'
                                : step < currentStep
                                    ? 'w-1.5 bg-blue-300 dark:bg-blue-600'
                                    : 'w-1.5 bg-gray-300 dark:bg-white/10'
                                }`}
                        />
                    ))}
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="mt-8 text-center"
                >
                    <p className="text-gray-400 dark:text-gray-500/60 text-xs tracking-widest uppercase font-medium">
                        © 2025 UPTM FCOM · Profile Setup
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
