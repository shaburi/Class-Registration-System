import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Users,
    Calendar,
    Plus,
    Edit,
    Trash2,
    X,
    FileSpreadsheet,
    Clock,
    Upload,
    Search,
} from 'lucide-react';

export default function SubjectsTab({ subjects, subjectProgrammeMap, onRefresh, onAdd, onEdit, onDelete, onDeleteAll, onImport, onImportFile }) {
    const [searchQuery, setSearchQuery] = useState('');

    // Helper: get all programmes a subject belongs to
    const getProgrammes = (code) => {
        const fromMap = subjectProgrammeMap[code] || [];
        // Also include the subject's own programme field as fallback
        const subjectOwn = subjects.filter(s => s.code === code).map(s => s.programme).filter(Boolean);
        const all = [...new Set([...fromMap, ...subjectOwn])];
        return all.length > 0 ? all : ['—'];
    };

    const filteredSubjects = useMemo(() => subjects.filter(subject => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!(subject.code || '').toLowerCase().includes(q) &&
                !(subject.name || '').toLowerCase().includes(q)) {
                return false;
            }
        }
        return true;
    }), [subjects, searchQuery]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/70 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                            <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        Manage Subjects
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 ml-14 font-medium">Configure academic curriculum and courses</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {onDeleteAll && subjects.length > 0 && (
                        <button
                            onClick={onDeleteAll}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-gray-200 dark:border-red-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-red-500/20 backdrop-blur-md"
                        >
                            <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Delete All</span>
                        </button>
                    )}
                    {onImportFile && (
                        <button
                            onClick={onImportFile}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-emerald-500/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-gray-200 dark:border-emerald-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-emerald-500/20 backdrop-blur-md"
                        >
                            <FileSpreadsheet size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Import File</span>
                        </button>
                    )}
                    {onImport && (
                        <button
                            onClick={onImport}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-blue-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-blue-500/20 backdrop-blur-md"
                        >
                            <Upload size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Import CSV</span>
                        </button>
                    )}
                    <button
                        onClick={onAdd}
                        className="group relative overflow-hidden flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full md:rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 text-sm transition-all duration-300 border border-white/20"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
                        <Plus size={20} className="relative z-10 transition-transform group-hover:rotate-90" />
                        <span className="hidden md:block ml-2 font-bold uppercase tracking-wider relative z-10">Add Subject</span>
                    </button>
                </div>
            </div>

            {/* Search Bar - Recessed Glass */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-red-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative flex items-center bg-white/50 dark:bg-[#07090e]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-300 focus-within:border-blue-500/50">
                    <div className="pl-5">
                        <Search size={20} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors duration-300" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search subjects by code or name..."
                        className="w-full pl-4 pr-12 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none font-medium"
                    />
                    <AnimatePresence>
                        {searchQuery && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20 hover:text-gray-800 dark:hover:text-white transition-all"
                            >
                                <X size={14} strokeWidth={3} />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />

                    <div className="relative z-10 w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500/10 to-red-500/10 dark:from-white/5 dark:to-white/5 border border-blue-500/20 dark:border-white/10 flex items-center justify-center mb-6 shadow-inner">
                        <BookOpen size={40} className="text-blue-500 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                    </div>
                    <h3 className="relative z-10 text-2xl font-black text-gray-900 dark:text-white mb-3">Curriculum Empty</h3>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-10 font-medium leading-relaxed">
                        The academic registry is currently empty. Get started by adding a new subject manually or importing an entire semester structure via CSV.
                    </p>
                    <button
                        onClick={onAdd}
                        className="relative z-10 inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-1 active:translate-y-0 text-sm tracking-wide transition-all duration-300 border border-white/20 font-bold uppercase"
                    >
                        <Plus size={20} />
                        Add First Subject
                    </button>
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gray-500/10 dark:bg-white/5 rounded-full blur-[50px] pointer-events-none" />
                    <Search size={48} className="relative z-10 mx-auto mb-6 text-gray-300 dark:text-gray-600 drop-shadow-md" />
                    <h3 className="relative z-10 text-xl font-bold text-gray-900 dark:text-white mb-2">No subjects found</h3>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400 font-medium">No results match <span className="text-blue-500 font-bold">"{searchQuery}"</span></p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSubjects.map((subject, index) => (
                        <motion.div
                            key={subject.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative rounded-3xl p-6 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-red-500/0 group-hover:from-blue-500/5 group-hover:to-red-500/5 transition-colors duration-500" />
                            <div className="absolute -inset-[1px] rounded-3xl border border-transparent group-hover:border-blue-500/30 dark:group-hover:border-blue-400/30 transition-colors duration-500 pointer-events-none" />

                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 translate-y-2 group-hover:translate-y-0">
                                <button
                                    onClick={() => onEdit(subject.id)}
                                    className="p-2 rounded-xl bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 backdrop-blur-md shadow-sm transition-all border border-gray-200 dark:border-white/10"
                                    title="Edit Subject"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(subject.id)}
                                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 backdrop-blur-md transition-all border border-red-500/20"
                                    title="Delete Subject"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="relative z-10 mb-6">
                                <span className={`inline-block text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r drop-shadow-sm ${index % 3 === 0 ? 'from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-400' :
                                    index % 3 === 1 ? 'from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400' :
                                        'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400'
                                    }`}>
                                    {subject.code}
                                </span>
                                <h4 className="text-gray-900 dark:text-white/90 font-bold leading-tight mt-2 text-lg group-hover:text-blue-600 dark:group-hover:text-white transition-colors duration-300">
                                    {subject.name}
                                </h4>
                            </div>

                            <div className="relative z-10 flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-200/50 dark:border-white/5">
                                <span className="px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 shadow-sm">
                                    <Clock size={14} className="text-blue-500 dark:text-blue-400" />
                                    {subject.credit_hours} Credits
                                </span>
                                <span className="px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 shadow-sm">
                                    <Calendar size={14} className="text-blue-500 dark:text-blue-400" />
                                    Sem {subject.semester || '?'}
                                </span>
                                <span className="px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 shadow-sm">
                                    <Users size={14} className="text-red-500 dark:text-red-400" />
                                    {getProgrammes(subject.code).join(', ')}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
