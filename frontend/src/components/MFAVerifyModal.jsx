import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, AlertTriangle, Loader2, KeyRound, Key } from 'lucide-react';

/**
 * MFA Verification Modal
 * Shown during login when 2FA is enabled.
 * User enters their 6-digit TOTP code or a backup code.
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 pb-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            Two-Factor Authentication
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {useBackupCode
                                ? 'Enter one of your backup codes'
                                : 'Enter the 6-digit code from your authenticator app'
                            }
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleVerify} className="p-6 space-y-4">
                        <div className="relative">
                            {useBackupCode ? (
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            ) : (
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            )}
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
                                    }
                                    setToken(val);
                                    setError('');
                                }}
                                placeholder={useBackupCode ? 'ABCD-EF12' : '000000'}
                                className={`w-full pl-10 pr-4 py-3.5 text-center font-mono tracking-[0.3em] bg-white dark:bg-gray-700 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-gray-900 dark:text-white ${useBackupCode ? 'text-lg' : 'text-2xl tracking-[0.5em]'
                                    } ${error ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'}`}
                                autoComplete="one-time-code"
                            />
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm text-red-500 flex items-center gap-2"
                            >
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </motion.p>
                        )}

                        <motion.button
                            type="submit"
                            disabled={loading || (!useBackupCode && token.length !== 6) || (useBackupCode && token.length < 8)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5" />
                                    Verify
                                </>
                            )}
                        </motion.button>

                        {/* Toggle backup code mode */}
                        <button
                            type="button"
                            onClick={() => {
                                setUseBackupCode(!useBackupCode);
                                setToken('');
                                setError('');
                            }}
                            className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition"
                        >
                            {useBackupCode
                                ? '← Use authenticator app code'
                                : 'Lost your phone? Use a backup code →'
                            }
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
