import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Copy, CheckCircle, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import api from '../services/api';

/**
 * MFA Setup Modal
 * Guides user through enabling 2FA with QR code scanning and backup codes.
 */
export default function MFASetupModal({ onClose, onEnabled }) {
    const [step, setStep] = useState('loading'); // loading, scan, verify, backup
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [token, setToken] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);
    const [copiedCodes, setCopiedCodes] = useState(false);
    const inputRef = useRef(null);

    // Generate secret on mount
    useEffect(() => {
        setupMFA();
    }, []);

    const setupMFA = async () => {
        try {
            const response = await api.post('/auth/mfa/setup');
            setQrCodeUrl(response.data.qrCodeDataUrl);
            setSecret(response.data.secret);
            setStep('scan');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to setup 2FA');
            setStep('error');
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (token.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/mfa/enable', { secret, token });
            setBackupCodes(response.data.backupCodes);
            setStep('backup');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
    };

    const handleCopyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2000);
    };

    const handleDone = () => {
        if (onEnabled) onEnabled();
        onClose();
    };

    // Auto-focus input when step changes to verify
    useEffect(() => {
        if (step === 'scan' && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [step]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {step === 'backup' ? 'Save Backup Codes' : 'Enable Two-Factor Auth'}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {step === 'scan' && 'Step 1: Scan QR Code'}
                                    {step === 'backup' && 'Step 2: Save your recovery codes'}
                                    {step === 'loading' && 'Generating secret...'}
                                    {step === 'error' && 'Setup failed'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {/* Loading State */}
                        {step === 'loading' && (
                            <div className="flex flex-col items-center py-12">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">Generating your 2FA secret...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {step === 'error' && (
                            <div className="text-center py-8">
                                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                                <button
                                    onClick={setupMFA}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {/* Step 1: Scan QR Code */}
                        {step === 'scan' && (
                            <div className="space-y-5">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                                </p>

                                {/* QR Code */}
                                <div className="flex justify-center">
                                    <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-200">
                                        <img
                                            src={qrCodeUrl}
                                            alt="2FA QR Code"
                                            className="w-48 h-48"
                                        />
                                    </div>
                                </div>

                                {/* Manual Entry */}
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        Can't scan? Enter this code manually:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 break-all">
                                            {secret}
                                        </code>
                                        <button
                                            onClick={handleCopySecret}
                                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition flex-shrink-0"
                                            title="Copy secret"
                                        >
                                            {copiedSecret ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-gray-500" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Verify Form */}
                                <form onSubmit={handleVerify} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Enter the 6-digit code from your app:
                                        </label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={6}
                                                value={token}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setToken(val);
                                                    setError('');
                                                }}
                                                placeholder="000000"
                                                className="w-full pl-10 pr-4 py-3 text-center text-2xl font-mono tracking-[0.5em] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <p className="text-sm text-red-500 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            {error}
                                        </p>
                                    )}

                                    <motion.button
                                        type="submit"
                                        disabled={loading || token.length !== 6}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <Shield className="w-5 h-5" />
                                                Verify & Enable 2FA
                                            </>
                                        )}
                                    </motion.button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Backup Codes */}
                        {step === 'backup' && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        <strong>Save these codes!</strong> If you lose your phone, you'll need these to access your account. Each code can only be used once.
                                    </p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        {backupCodes.map((code, i) => (
                                            <div
                                                key={i}
                                                className="font-mono text-sm text-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                                            >
                                                {code}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleCopyBackupCodes}
                                    className="w-full py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
                                >
                                    {copiedCodes ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            Copied to Clipboard!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-5 h-5" />
                                            Copy All Codes
                                        </>
                                    )}
                                </button>

                                <motion.button
                                    onClick={handleDone}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    I've Saved My Codes — Done
                                </motion.button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
