import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, Sparkles, GraduationCap } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import GoogleSignInButton from '../components/GoogleSignInButton';
import TiltCard from '../components/TiltCard';
import MFAVerifyModal from '../components/MFAVerifyModal';
import axios from 'axios';

// Decorative Volumetric Glows
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
        {/* Subtle grid texture overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMSkiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay"></div>
    </div>
);

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMfaModal, setShowMfaModal] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const { setUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/auth/login`,
                { email, password }
            );

            if (response.data.success) {
                if (response.data.requiresMfa) {
                    // MFA required — show verification modal
                    setTempToken(response.data.tempToken);
                    setShowMfaModal(true);
                    setLoading(false);
                    return;
                }
                localStorage.setItem('token', response.data.token);
                setUser(response.data.user);
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (googleUser) => {
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/auth/google`,
                { idToken: googleUser.idToken }
            );

            if (response.data.success) {
                if (response.data.requiresMfa) {
                    setTempToken(response.data.tempToken);
                    setShowMfaModal(true);
                    setLoading(false);
                    return;
                }
                localStorage.setItem('token', response.data.token);
                setUser(response.data.user);
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Failed to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = (errorMessage) => {
        setError(errorMessage);
    };

    const fillDemoAccount = (demoEmail, demoPassword) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        setError('');
    };

    const handleMfaVerified = (data) => {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setShowMfaModal(false);
        navigate('/dashboard');
    };

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
                className="w-full max-w-[420px] relative z-10"
            >
                {/* Logo and Title */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, rotateX: 45 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                        className="inline-block mb-6 relative perspective-1000"
                    >
                        <TiltCard>
                            <div className="w-20 h-20 bg-gradient-to-b from-blue-600 to-[#1e3a8a] rounded-[1.25rem] flex items-center justify-center 
                                          shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5),inset_0_2px_0_0_rgba(255,255,255,0.2)] 
                                          ring-1 ring-white/10 transform-gpu rotate-0">
                                <GraduationCap className="w-10 h-10 text-white drop-shadow-md" />
                            </div>
                        </TiltCard>
                        <motion.div
                            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-3 -right-3"
                        >
                            <Sparkles className="w-8 h-8 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)]" />
                        </motion.div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-[2.5rem] font-heading font-black text-gray-900 dark:text-white mb-2 leading-none tracking-tight"
                    >
                        UPTM <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-red-500 animate-gradient-x drop-shadow-sm">Schedule</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-blue-600/60 dark:text-blue-200/60 font-medium tracking-wide text-sm uppercase letter-spacing-2"
                    >
                        Class Registration & Scheduling Concept
                    </motion.p>
                </div>

                {/* Highly Refined Glass Card */}
                <TiltCard className="relative group perspective-1000">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="relative rounded-[2rem] p-8 sm:p-10 transition-all duration-500
                                   bg-white/80 dark:bg-[#11131e]/80 backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)_inset] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)_inset]"
                    >
                        {/* Dynamic edge highlight */}
                        <div className="absolute inset-0 rounded-[2rem] border border-black/5 dark:border-white/5 group-hover:border-black/10 dark:group-hover:border-white/10 pointer-events-none transition-colors duration-500" />
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />

                        <h2 className="text-[1.35rem] font-bold text-gray-900 dark:text-white mb-8 font-heading flex items-center gap-2">
                            Welcome Back <span className="text-xl animate-wave origin-bottom-right inline-block">👋</span>
                        </h2>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 backdrop-blur-sm shadow-inner">
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                        <p className="text-red-400 text-sm font-medium">{error}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 font-heading">
                                    Account Identity
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform duration-300 group-focus-within/input:scale-110">
                                        <Mail className="h-5 w-5 text-gray-500 group-focus-within/input:text-blue-400 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none 
                                                   text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-all duration-300
                                                   focus:bg-blue-50 dark:focus:bg-blue-600/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                                                   shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                        placeholder="your.email@uptm.edu.my"
                                        required
                                    />
                                    {/* Subtle focus glow line */}
                                    <div className="absolute bottom-0 inset-x-4 h-[1px] bg-blue-500 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left opacity-50" />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 font-heading">
                                    Security Key
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform duration-300 group-focus-within/input:scale-110">
                                        <Lock className="h-5 w-5 text-gray-500 group-focus-within/input:text-red-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none 
                                                   text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-all duration-300
                                                   focus:bg-red-50 dark:focus:bg-red-600/10 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50
                                                   shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <div className="absolute bottom-0 inset-x-4 h-[1px] bg-red-500 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left opacity-50" />
                                </div>
                            </div>

                            {/* Submit */}
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full relative group/btn overflow-hidden rounded-xl bg-blue-700 
                                           border border-white/10 text-white font-bold tracking-wide
                                           shadow-[0_0_20px_-5px_rgba(220,38,38,0.5),inset_0_1px_0_0_rgba(255,255,255,0.2)]
                                           hover:shadow-[0_0_30px_-5px_rgba(220,38,38,0.7),inset_0_1px_0_0_rgba(255,255,255,0.3)]
                                           transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                <div className="relative px-4 py-3.5 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="w-5 h-5 opacity-90" />
                                            <span>Access Portal</span>
                                        </>
                                    )}
                                </div>
                            </motion.button>
                        </form>

                        {/* Divider */}
                        <div className="my-8 relative flex items-center justify-center">
                            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent" />
                            <span className="relative z-10 bg-white dark:bg-[#11131e] px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase font-heading">
                                OR CONTINUE WITH
                            </span>
                        </div>

                        {/* Google Sign-In */}
                        <div className="relative">
                            <GoogleSignInButton
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                            />
                        </div>

                        {/* Demo Accounts */}
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <p className="text-xs font-semibold text-gray-500 text-center mb-4 uppercase tracking-widest font-heading">
                                Sandbox Identities
                            </p>
                            <div className="flex justify-center gap-2.5 flex-wrap">
                                {[
                                    { label: 'Student', email: 'student1@student.uptm.edu.my', color: 'blue' },
                                    { label: 'Lecturer', email: 'lecturer1@uptm.edu.my', color: 'red' },
                                    { label: 'CT206', email: 'hop1@uptm.edu.my', color: 'amber' },
                                    { label: 'CT204', email: 'hop2@uptm.edu.my', color: 'orange' },
                                    { label: 'CC101', email: 'hop3@uptm.edu.my', color: 'rose' }
                                ].map((demo) => (
                                    <motion.button
                                        key={demo.label}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => fillDemoAccount(demo.email, 'password123')}
                                        className={`px-3.5 py-1.5 bg-${demo.color}-50 dark:bg-${demo.color}-500/10 text-${demo.color}-600 dark:text-${demo.color}-400 
                                                  text-[11px] font-bold tracking-wider rounded-lg transition-all duration-300 
                                                  border border-${demo.color}-200 dark:border-${demo.color}-500/20 hover:bg-${demo.color}-100 dark:hover:bg-${demo.color}-500/20 
                                                  hover:border-${demo.color}-300 dark:hover:border-${demo.color}-500/40 shadow-sm dark:shadow-inner`}
                                    >
                                        {demo.label}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </TiltCard>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="mt-10 text-center"
                >
                    <p className="text-gray-400 dark:text-gray-500/60 text-xs tracking-widest uppercase font-medium">
                        © 2025 UPTM FCOM · Project Instance
                    </p>
                </motion.div>
            </motion.div>

            {/* MFA Verification Modal */}
            {showMfaModal && (
                <MFAVerifyModal
                    tempToken={tempToken}
                    onVerified={handleMfaVerified}
                    onCancel={() => {
                        setShowMfaModal(false);
                        setTempToken('');
                        setLoading(false);
                    }}
                />
            )}
        </div>
    );
}
