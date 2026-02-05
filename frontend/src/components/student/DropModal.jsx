import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

const DropModal = ({ isOpen, onClose, registration, onConfirm }) => {
    const [reason, setReason] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    if (!isOpen || !registration) return null;

    const handleSubmit = async () => {
        if (!reason.trim()) {
            alert('Please provide a reason for dropping the course.');
            return;
        }
        setIsSubmitting(true);
        // Simulate slight delay for better UX or if actual async logic is handled here
        await onConfirm(registration.registration_id, reason);
        setIsSubmitting(false);
        setReason('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            >
                <div className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/50">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Drop Course?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Are you sure you want to drop <span className="font-bold text-gray-800 dark:text-gray-200">{registration.subject_code}</span>?
                        This action request will need approval.
                    </p>
                </div>

                <div className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reason for Dropping
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Schedule conflict, Taking next semester..."
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white h-24 resize-none"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md shadow-red-500/20 transition flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                'Processing...'
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" /> Confirm Drop
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DropModal;
