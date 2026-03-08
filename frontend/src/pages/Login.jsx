import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import GoogleSignInButton from '../components/GoogleSignInButton';
import MFAVerifyModal from '../components/MFAVerifyModal';
import axios from 'axios';

// Sophisticated ambient background
const AmbientBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#fafafa] dark:bg-[#050505] transition-colors duration-700">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-rose-400/10 dark:bg-rose-900/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70" />
        <div className="absolute top-[40%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-violet-400/5 dark:bg-violet-600/5 blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-50" />

        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }}></div>
    </div>
);

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMfaModal, setShowMfaModal] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [showSandbox, setShowSandbox] = useState(false);
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
            setError(err.response?.data?.message || 'Invalid credentials');
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
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = (errorMessage) => {
        setError(errorMessage);
    };



    const handleMfaVerified = (data) => {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setShowMfaModal(false);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-body selection:bg-blue-500/20 selection:text-blue-900 dark:selection:text-blue-100">
            <AmbientBackground />

            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle className="bg-white/50 dark:bg-black/50 backdrop-blur-md border border-gray-200/50 dark:border-white/10 shadow-sm" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[400px] relative z-10 px-4"
            >
                {/* Refined Header */}
                <div className="flex flex-col items-center mb-6">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                        className="w-20 h-20 sm:w-24 sm:h-24 relative group"
                    >
                        <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all duration-700" />
                        <img src="/logo.png" alt="UPTM Logo" className="w-full h-full object-contain relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:scale-105" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-center space-y-1.5"
                    >
                        <h1 className="text-[1.8rem] sm:text-[2.2rem] font-heading font-black text-gray-900 dark:text-white mb-2 leading-tight tracking-tight">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-blue-600 to-red-600 animate-gradient-x drop-shadow-sm">
                                Class Registration & Scheduling System
                            </span>
                        </h1>
                    </motion.div>
                </div>

                {/* Minimalist Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="w-full bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-2xl rounded-[20px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-gray-200/50 dark:border-white/5 relative"
                >
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <p className="text-red-600 dark:text-red-400 text-xs font-semibold">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1 font-heading">
                                Email Address
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-gray-400 group-focus-within/input:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (e.target.value === 'ilovetwice123') {
                                            setShowSandbox(true);
                                            setEmail('');
                                        }
                                    }}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl outline-none 
                                               text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-all duration-300
                                               focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-blue-500/50 focus:ring-[3px] focus:ring-blue-500/10"
                                    placeholder="user@uptm.edu.my"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1 font-heading">
                                Password
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400 group-focus-within/input:text-gray-700 dark:group-focus-within/input:text-white transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl outline-none 
                                               text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-all duration-300
                                               focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-gray-500/30 focus:ring-[3px] focus:ring-gray-500/10"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 relative overflow-hidden rounded-xl text-white font-semibold tracking-wide text-sm
                                       shadow-[0_4px_14px_0_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] 
                                       transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group/btn border border-white/10"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-blue-600 opacity-90 group-hover/btn:opacity-100 transition-opacity duration-300" />
                            <div className="relative flex items-center justify-center gap-2">
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight className="w-4 h-4 opacity-70 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                                    </>
                                )}
                            </div>
                        </motion.button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-heading">
                            Or continue with
                        </span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>

                    <div className="w-full flex justify-center">
                        <GoogleSignInButton
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                        />
                    </div>
                </motion.div>

                {showSandbox && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mt-6 text-center"
                    >
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-heading mb-3">
                            🔓 Sandbox Identities
                        </p>
                        <div className="flex justify-center gap-2 flex-wrap max-w-xs mx-auto">
                            {[
                                { label: 'Student', email: 'student1@student.uptm.edu.my' },
                                { label: 'Lecturer', email: 'lecturer1@uptm.edu.my' },
                                { label: 'CT206', email: 'hop1@uptm.edu.my' },
                                { label: 'CT204', email: 'hop2@uptm.edu.my' },
                                { label: 'CC101', email: 'hop3@uptm.edu.my' }
                            ].map((demo) => (
                                <button
                                    key={demo.label}
                                    type="button"
                                    onClick={() => { setEmail(demo.email); setPassword('password123'); setError(''); }}
                                    className="px-3 py-1.5 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-[11px] font-medium tracking-wide rounded-lg transition-all duration-200 hover:shadow-sm"
                                >
                                    {demo.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                <div className="mt-8 text-center">
                    <p className="text-gray-400 dark:text-gray-600 text-[10px] tracking-widest uppercase font-semibold">
                        © 2026 UPTM FCOM · Project Instance
                    </p>
                </div>
            </motion.div>

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
