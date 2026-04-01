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
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
                onClick={onCancel}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-900">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Two-Factor Auth
                                </h2>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {useBackupCode ? 'Use recovery code' : 'Verification step'}
                                </p>
                            </div>
                        </div>
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="p-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-800"
                            >
                                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                            {useBackupCode
                                ? 'Enter one of your 8-character backup recovery codes.'
                                : 'Enter the 6-digit code from your authenticator application.'
                            }
                        </p>

                        <form onSubmit={handleVerify} className="space-y-6">
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 transition-transform duration-300">
                                    {useBackupCode ? (
                                        <Key className="h-5 w-5 text-gray-400 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
                                    ) : (
                                        <KeyRound className="h-5 w-5 text-gray-400 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white transition-colors" />
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
                                    placeholder={useBackupCode ? 'ABCD-EF12' : '000000'}
                                    className={`w-full pl-12 pr-4 py-4 text-center font-mono bg-white dark:bg-[#0b0c10] 
                                                border border-gray-300 dark:border-gray-700 rounded-xl outline-none
                                                text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600
                                                focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white 
                                                transition-all shadow-sm
                                                ${useBackupCode ? 'text-lg tracking-[0.2em]' : 'text-2xl tracking-[0.4em] font-medium'} 
                                                ${error ? '!border-red-500/50 !focus:ring-red-500/50 !bg-red-50 dark:!bg-red-900/10 text-red-600 dark:text-red-400' : ''}`}
                                    autoComplete="one-time-code"
                                    spellCheck="false"
                                />
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-3">
                                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-500 flex-shrink-0" />
                                            <p className="text-red-600 dark:text-red-400 text-sm font-bold">{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={loading || (!useBackupCode && token.length !== 6) || (useBackupCode && token.length < 8)}
                                className="w-full py-3.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 font-bold rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Authenticating
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-5 h-5" />
                                        Verify Identity
                                    </>
                                )}
                            </button>

                            {/* Toggle backup code mode */}
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUseBackupCode(!useBackupCode);
                                        setToken('');
                                        setError('');
                                        setTimeout(() => inputRef.current?.focus(), 100);
                                    }}
                                    className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    {useBackupCode
                                        ? 'Back to Authenticator App'
                                        : 'Use a backup code'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
