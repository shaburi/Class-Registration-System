import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info } from 'lucide-react';

const GlassToast = ({ t, type = 'success', message }) => {
    const isSuccess = type === 'success';
    const isError = type === 'error';

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } glass-card border-l-4 pointer-events-auto flex w-full max-w-sm rounded-xl bg-white/10 dark:bg-black/40 shadow-lg ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md p-4`}
            style={{
                borderLeftColor: isSuccess ? '#10b981' : isError ? '#ef4444' : '#6366f1'
            }}
        >
            <div className="flex w-full items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                    {isSuccess && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                    {isError && <XCircle className="h-5 w-5 text-red-500" />}
                    {!isSuccess && !isError && <Info className="h-5 w-5 text-indigo-500" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {isSuccess ? 'Success' : isError ? 'Error' : 'Note'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {message}
                    </p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                    <button
                        className="inline-flex text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        onClick={() => toast.dismiss(t.id)}
                    >
                        <span className="sr-only">Close</span>
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export const showGlassToast = {
    success: (msg) => toast.custom((t) => <GlassToast t={t} type="success" message={msg} />),
    error: (msg) => toast.custom((t) => <GlassToast t={t} type="error" message={msg} />),
    info: (msg) => toast.custom((t) => <GlassToast t={t} type="info" message={msg} />)
};

export default GlassToast;
