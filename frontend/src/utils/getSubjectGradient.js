// Helper for gradient color blocks on timetable grids (Builder / Student views)
const getSubjectGradient = (code) => {
    const gradients = [
        'bg-gradient-to-br from-blue-600 to-blue-600 border-blue-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(37,99,235,0.3)]',
        'bg-gradient-to-br from-red-600 to-rose-700 border-red-500/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(220,38,38,0.3)]',
        'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(16,185,129,0.3)]',
        'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(245,158,11,0.3)]',
        'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(6,182,212,0.3)]',
        'bg-gradient-to-br from-violet-500 to-fuchsia-600 border-violet-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(139,92,246,0.3)]',
        'bg-gradient-to-br from-[#1a1d29] to-[#0d0f18] border-gray-600/50 text-gray-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_10px_rgba(0,0,0,0.4)]',
        'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(244,63,94,0.3)]',
        'bg-gradient-to-br from-lime-500 to-green-600 border-lime-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(132,204,22,0.3)]',
        'bg-gradient-to-br from-[#0c4a6e] to-[#082f49] border-sky-600/50 text-sky-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_10px_rgba(12,74,110,0.4)]',
    ];
    if (!code) return gradients[0];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
};

export default getSubjectGradient;
