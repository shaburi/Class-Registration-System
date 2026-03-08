import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, AlertCircle, Loader2, KeyRound, Key } from 'lucide-react';

/**
 * MFA Verification Modal
 * Refined and stylized with dual-theme glassmorphism aesthetic
 */
export default function MFAVerifyModal({ tempToken, onVerified, onCancel }) {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [useBackupCode, setUseBackupCode] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        // Auto-focus
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [useBackupCode]);

    const handleVerify = async (e) => {
        e.preventDefault();

        if (!useBackupCode && token.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        if (useBackupCode && token.length < 8) {
            setError('Please enter a valid backup code (e.g. ABCD-EF12)');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${apiUrl}/api/v1/auth/mfa/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tempToken,
                    mfaToken: token.replace('-', '') // Remove dash for backup codes
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Verification failed');
            }

            if (data.success) {
                onVerified(data);
            }
        } catch (err) {
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/30 dark:bg-[#050505]/80 backdrop-blur-md transition-colors duration-500"
            >
                {/* Immersive Background Glow */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                        className="w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/20 to-purple-500/20 dark:from-blue-600/10 dark:to-purple-900/10 rounded-full blur-[120px] mix-blend-screen dark:mix-blend-lighten"
                    />
                </div>

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-[420px] rounded-[2rem] p-8 sm:p-10 relative overflow-hidden z-10 
                               bg-white/90 dark:bg-[#11131e]/90 backdrop-blur-2xl 
                               shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)_inset] 
                               dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)_inset]"
                >
                    {/* Edge highlight */}
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 dark:via-blue-500/50 to-transparent" />

                    {/* Header */}
                    <div className="relative mb-8 text-center">
                        <div className="flex justify-center mb-6 relative">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
                                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                                className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center 
                                           shadow-[0_15px_30px_-5px_rgba(79,70,229,0.4),inset_0_2px_0_0_rgba(255,255,255,0.2)] 
                                           ring-1 ring-white/20 relative z-10"
                            >
                                <Shield className="w-8 h-8 text-white drop-shadow-md" />
                            </motion.div>
                            {/* Subtle halo */}
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full scale-150" />
                        </div>

                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="absolute top-0 right-0 p-2 -mr-4 -mt-4 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2 font-heading">
                            Two-Factor Auth
                        </h2>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed px-4">
                            {useBackupCode
                                ? 'Enter one of your 8-character backup recovery codes.'
                                : 'Enter the 6-digit code from your authenticator application.'
                            }
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleVerify} className="relative space-y-6">
                        <div className="relative group/input">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10 transition-transform duration-300 group-focus-within/input:scale-110">
                                {useBackupCode ? (
                                    <Key className="h-5 w-5 text-gray-400 group-focus-within/input:text-indigo-500 transition-colors" />
                                ) : (
                                    <KeyRound className="h-5 w-5 text-gray-400 group-focus-within/input:text-indigo-500 transition-colors" />
                                )}
                            </div>

                            <input
                                ref={inputRef}
                                type="text"
                                inputMode={useBackupCode ? 'text' : 'numeric'}
                                pattern={useBackupCode ? undefined : '[0-9]*'}
                                maxLength={useBackupCode ? 9 : 6}
                                value={token}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (!useBackupCode) {
                                        val = val.replace(/\D/g, '');
                                    } else {
                                        val = val.toUpperCase();
                                    }
                                    setToken(val);
                                    setError('');
                                }}
                                placeholder={useBackupCode ? 'ABCD-EF12' : '0 0 0  0 0 0'}
                                className={`w-full pl-14 pr-5 py-4 text-center font-mono bg-gray-50 dark:bg-black/40 
                                            border border-gray-200 dark:border-white/10 rounded-xl outline-none
                                            text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600
                                            focus:bg-white dark:focus:bg-white/5 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 
                                            transition-all duration-300 shadow-inner
                                            ${useBackupCode ? 'text-lg tracking-[0.2em]' : 'text-2xl tracking-[0.3em] font-medium'} 
                                            ${error ? '!border-red-500/50 !focus:ring-red-500/50 !bg-red-50/50 dark:!bg-red-500/5 text-red-600 dark:text-red-400' : ''}`}
                                autoComplete="one-time-code"
                                spellCheck="false"
                            />
                            {/* Focus indicator line */}
                            <div className={`absolute bottom-0 inset-x-5 h-[2px] rounded-t-md scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-center ${error ? 'bg-red-500' : 'bg-indigo-500'} opacity-70`} />
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-2">
                            <motion.button
                                type="submit"
                                disabled={loading || (!useBackupCode && token.length !== 6) || (useBackupCode && token.length < 8)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full relative group/btn overflow-hidden rounded-xl bg-gray-900 dark:bg-indigo-600
                                           border border-gray-800 dark:border-white/10 text-white font-bold tracking-wide py-4
                                           shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] dark:shadow-[0_0_20px_-5px_rgba(79,70,229,0.5),inset_0_1px_0_0_rgba(255,255,255,0.2)]
                                           hover:shadow-[0_15px_25px_-10px_rgba(0,0,0,0.6)] dark:hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.7),inset_0_1px_0_0_rgba(255,255,255,0.3)]
                                           transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-indigo-500 dark:to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                <div className="relative flex items-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin opacity-80" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-5 h-5 opacity-90" />
                                            <span>Verify Identity</span>
                                        </>
                                    )}
                                </div>
                            </motion.button>
                        </div>

                        {/* Toggle backup code mode */}
                        <div className="pt-4 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setUseBackupCode(!useBackupCode);
                                    setToken('');
                                    setError('');
                                    setTimeout(() => inputRef.current?.focus(), 100);
                                }}
                                className="text-sm font-semibold text-indigo-600 dark:text-blue-400 hover:text-indigo-800 dark:hover:text-blue-300 hover:underline transition-colors inline-block tracking-wide"
                            >
                                {useBackupCode
                                    ? 'Back to Authenticator App'
                                    : 'Lost access? Use a backup code ➔'
                                }
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
