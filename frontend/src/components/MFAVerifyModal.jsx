import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, AlertCircle, Loader2, KeyRound, Key } from 'lucide-react';

/**
 * MFA Verification Modal
 * Refined and stylized with glassmorphism aesthetic
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
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-xl"
            >
                {/* Immersive Background Glow */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-sm rounded-[1.5rem] p-8 relative overflow-hidden z-10 
                               bg-[#151720]/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] 
                               border border-white/5 ring-1 ring-white/10"
                >
                    {/* Header */}
                    <div className="relative mb-6">
                        <div className="flex items-start justify-between mb-5">
                            <motion.div
                                initial={{ rotate: -15, scale: 0.8 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                                className="w-12 h-12 bg-gradient-to-b from-blue-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 ring-1 ring-white/20"
                            >
                                <Shield className="w-6 h-6 text-white" />
                            </motion.div>

                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="p-2 -mr-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <h2 className="text-[1.35rem] font-bold text-white tracking-tight mb-2 font-heading">
                            Two-Factor Authentication
                        </h2>
                        <p className="text-sm font-medium text-gray-400 leading-relaxed">
                            {useBackupCode
                                ? 'Enter one of your 8-character backup codes.'
                                : 'Enter the 6-digit code from your authenticator app.'
                            }
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleVerify} className="relative space-y-6">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                {useBackupCode ? (
                                    <Key className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                                ) : (
                                    <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
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
                                className={`w-full pl-12 pr-4 py-4 text-center font-mono bg-white/5 border border-white/10 rounded-xl 
                                            focus:bg-blue-500/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 
                                            transition-all duration-300 text-white shadow-inner placeholder:text-gray-600 outline-none
                                            ${useBackupCode ? 'text-lg tracking-[0.2em]' : 'text-xl tracking-[0.4em]'} 
                                            ${error ? '!border-red-500/50 !focus:ring-red-500/50' : ''}`}
                                autoComplete="one-time-code"
                                spellCheck="false"
                            />
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <p className="text-red-400 text-xs font-semibold">{error}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-1">
                            <motion.button
                                type="submit"
                                disabled={loading || (!useBackupCode && token.length !== 6) || (useBackupCode && token.length < 8)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3.5 bg-[#5b45b0] hover:bg-[#6b52c9] text-white font-bold rounded-xl 
                                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors 
                                           flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin opacity-80" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-4 h-4 opacity-80" />
                                        <span>Verify</span>
                                    </>
                                )}
                            </motion.button>
                        </div>

                        {/* Toggle backup code mode */}
                        <div className="pt-2 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setUseBackupCode(!useBackupCode);
                                    setToken('');
                                    setError('');
                                    setTimeout(() => inputRef.current?.focus(), 100);
                                }}
                                className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors inline-block"
                            >
                                {useBackupCode
                                    ? 'Back to Authenticator App'
                                    : 'Lost your phone? Use a backup code →'
                                }
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
