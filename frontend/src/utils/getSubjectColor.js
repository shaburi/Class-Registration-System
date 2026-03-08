// Helper for consistent subject colors across timetable views
const getSubjectColor = (code) => {
    const colors = [
        'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-100',
        'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-100',
        'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-100',
        'bg-green-100 border-green-300 text-green-900 dark:bg-green-900/40 dark:border-green-700 dark:text-green-100',
        'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-100',
        'bg-teal-100 border-teal-300 text-teal-900 dark:bg-teal-900/40 dark:border-teal-700 dark:text-teal-100',
        'bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-100',
        'bg-sky-100 border-sky-300 text-sky-900 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-100',
        'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100',
        'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100',
        'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-100',
        'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-100',
        'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:border-fuchsia-700 dark:text-fuchsia-100',
        'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-100',
        'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-100',
    ];

    if (!code) return colors[0];

    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export default getSubjectColor;
