import { motion } from 'framer-motion';

const colorGradients = {
    indigo: { gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
    purple: { gradient: 'from-purple-500 to-purple-600', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    cyan: { gradient: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' },
    pink: { gradient: 'from-pink-500 to-pink-600', light: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' },
    green: { gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
    teal: { gradient: 'from-teal-500 to-teal-600', light: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' },
    orange: { gradient: 'from-orange-500 to-orange-600', light: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
    blue: { gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
};

export default function StatsCard({ icon, title, value, color = 'indigo', subtitle, trend }) {
    const colors = colorGradients[color] || colorGradients.indigo;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-100 dark:border-gray-700/50 overflow-hidden group"
        >
            {/* Decorative gradient blob */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${colors.gradient} rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

            <div className="relative z-10">
                {/* Icon */}
                <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    className={`inline-flex p-3.5 rounded-xl bg-gradient-to-br ${colors.gradient} text-white mb-4 shadow-lg`}
                >
                    {icon}
                </motion.div>

                {/* Title */}
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                    {title}
                </p>

                {/* Value */}
                <div className="flex items-end gap-2">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>
                    {trend && (
                        <span className={`text-sm font-medium ${trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>

                {/* Subtitle */}
                {subtitle && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {subtitle}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
