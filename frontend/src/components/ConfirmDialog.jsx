import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger' // 'danger' | 'warning' | 'info'
}) {


    const variants = {
        danger: {
            icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            button: 'bg-red-600 hover:bg-red-700 text-white'
        },
        warning: {
            icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            button: 'bg-amber-600 hover:bg-amber-700 text-white'
        },
        info: {
            icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            button: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
    };

    const styles = variants[variant] || variants.danger;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center pointer-events-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className="relative glass-card bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-blue-500/10 p-6 max-w-md w-full mx-4 pointer-events-auto"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all transform hover:rotate-90"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner ${variant === 'danger' ? 'bg-red-500/10 text-red-500 shadow-red-500/20' :
                                variant === 'warning' ? 'bg-amber-500/10 text-amber-500 shadow-amber-500/20' :
                                    'bg-blue-500/10 text-blue-500 shadow-blue-500/20'
                            }`}>
                            <AlertTriangle className="w-7 h-7" />
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                            {title}
                        </h3>
                        <p className="text-white/60 mb-8 leading-relaxed">
                            {message}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl font-medium transition-colors border border-white/5"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`px-5 py-2.5 rounded-xl font-medium text-white shadow-lg transition-all ${variant === 'danger' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/20' :
                                        variant === 'warning' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20' :
                                            'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/20'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
