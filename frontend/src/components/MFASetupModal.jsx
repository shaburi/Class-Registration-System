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
                className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
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
                                    {step === 'backup' ? 'Save Backup Codes' : 'Secure Account'}
                                </h2>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {step === 'scan' && 'Step 1: Install & Scan'}
                                    {step === 'backup' && 'Step 2: Recovery measures'}
                                    {step === 'loading' && 'Generating secure secret...'}
                                    {step === 'error' && 'Setup failed'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-800"
                        >
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {/* Loading State */}
                        {step === 'loading' && (
                            <div className="flex flex-col items-center py-12">
                                <Loader2 className="w-8 h-8 text-gray-900 dark:text-white animate-spin mb-4" />
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Generating cryptographic secret...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {step === 'error' && (
                            <div className="text-center py-10">
                                <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500 mx-auto mb-4" />
                                <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-6">{error}</p>
                                <button
                                    onClick={setupMFA}
                                    className="px-6 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 rounded-xl font-bold transition-colors shadow-sm"
                                >
                                    Retry Setup
                                </button>
                            </div>
                        )}

                        {/* Step 1: Scan QR Code */}
                        {step === 'scan' && (
                            <div className="space-y-6">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Open your authenticator app (e.g., Google Authenticator, Authy) and scan this code:
                                </p>

                                {/* QR Code */}
                                <div className="flex justify-center">
                                    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                                        <img
                                            src={qrCodeUrl}
                                            alt="2FA QR Code"
                                            className="w-40 h-40"
                                        />
                                    </div>
                                </div>

                                {/* Manual Entry */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Manual Key
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono bg-white dark:bg-[#0b0c10] px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white break-all shadow-sm">
                                            {secret}
                                        </code>
                                        <button
                                            onClick={handleCopySecret}
                                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 shadow-sm"
                                            title="Copy secret"
                                        >
                                            {copiedSecret ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Verify Form */}
                                <form onSubmit={handleVerify} className="space-y-5 pt-2 border-t border-gray-100 dark:border-gray-900">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            Verification Code
                                        </label>
                                        <div className="relative group/input">
                                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-600 group-focus-within/input:text-gray-900 dark:group-focus-within/input:text-white" />
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
                                                className="w-full pl-12 pr-4 py-3 text-center text-xl font-mono tracking-[0.5em] bg-white dark:bg-[#0b0c10] border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-colors text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {error}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || token.length !== 6}
                                        className="w-full py-3.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 font-bold rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 active:scale-[0.99]"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Verifying
                                            </>
                                        ) : (
                                            <>
                                                <Shield className="w-5 h-5" />
                                                Verify & Activate
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Backup Codes */}
                        {step === 'backup' && (
                            <div className="space-y-6">
                                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed">
                                        <strong className="text-amber-900 dark:text-amber-200">Critical:</strong> Store these codes securely. If you lose your authenticator app, these are the ONLY way to regain access to your account.
                                    </p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                                    <div className="grid grid-cols-2 gap-3">
                                        {backupCodes.map((code, i) => (
                                            <div
                                                key={i}
                                                className="font-mono text-sm font-medium text-center py-2.5 px-3 bg-white dark:bg-[#0b0c10] shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
                                            >
                                                {code}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleCopyBackupCodes}
                                    className="w-full py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/50 rounded-xl text-gray-900 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    {copiedCodes ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            Copied to Clipboard
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-5 h-5" />
                                            Copy All Codes
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleDone}
                                    className="w-full py-3.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.99]"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    I Have Saved Them
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
