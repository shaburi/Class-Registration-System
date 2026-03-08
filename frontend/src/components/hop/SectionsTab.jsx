import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Plus,
    Edit,
    Trash2,
    X,
    ChevronDown,
    Upload,
    Search,
    Layers,
} from 'lucide-react';

export default function SectionsTab({ sections, subjects, subjectProgrammeMap, onRefresh, onAdd, onEdit, onDelete, onViewStudents, onImport, onAssignLecturers, onClearAll }) {
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Group sections by subject (memoized)
    const groupedSections = useMemo(() => sections.reduce((acc, section) => {
        const key = section.subject_code || section.code || 'unknown';
        if (!acc[key]) {
            acc[key] = {
                code: section.subject_code || section.code || 'Unknown',
                name: section.subject_name || section.name || 'Unnamed Subject',
                sections: []
            };
        }
        acc[key].sections.push(section);
        return acc;
    }, {}), [sections]);

    const subjectGroups = useMemo(() => Object.values(groupedSections), [groupedSections]);

    const filteredGroups = useMemo(() => subjectGroups.filter(group => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!(group.code || '').toLowerCase().includes(q) &&
                !(group.name || '').toLowerCase().includes(q)) {
                return false;
            }
        }
        return true;
    }), [subjectGroups, searchQuery]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/70 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                            <Layers className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        Manage Sections
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 ml-14 font-medium">Organize and assemble course sections and capacities.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {onImport && (
                        <button
                            onClick={onImport}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-blue-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-blue-500/20 backdrop-blur-md"
                        >
                            <Upload size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Import CSV</span>
                        </button>
                    )}
                    {onAssignLecturers && (
                        <button
                            onClick={onAssignLecturers}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-teal-500/10 hover:bg-teal-50 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-gray-200 dark:border-teal-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-teal-500/20 backdrop-blur-md"
                        >
                            <Users size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Assign Lecturers</span>
                        </button>
                    )}
                    {sections.length > 0 && onClearAll && (
                        <button
                            onClick={onClearAll}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-gray-200 dark:border-red-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-red-500/20 backdrop-blur-md"
                        >
                            <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Clear All</span>
                        </button>
                    )}
                    <button
                        onClick={onAdd}
                        className="group relative overflow-hidden flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full md:rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 text-sm transition-all duration-300 border border-white/20"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
                        <Plus size={20} className="relative z-10 transition-transform group-hover:rotate-90" />
                        <span className="hidden md:block ml-2 font-bold uppercase tracking-wider relative z-10">Add Section</span>
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
                        placeholder="Search sections by subject code or name..."
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

            {/* Content */}
            {subjectGroups.length === 0 ? (
                <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />

                    <div className="relative z-10 w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500/10 to-red-500/10 dark:from-white/5 dark:to-white/5 border border-blue-500/20 dark:border-white/10 flex items-center justify-center mb-6 shadow-inner">
                        <Layers size={40} className="text-blue-500 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                    </div>
                    <h3 className="relative z-10 text-2xl font-black text-gray-900 dark:text-white mb-3">No Sections Yet</h3>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-10 font-medium leading-relaxed">
                        You have not created any sections yet. Start by generating new sections manually or importing a batch from CSV.
                    </p>
                    <button
                        onClick={onAdd}
                        className="relative z-10 inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-1 active:translate-y-0 text-sm tracking-wide transition-all duration-300 border border-white/20 font-bold uppercase"
                    >
                        <Plus size={20} />
                        Create First Section
                    </button>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gray-500/10 dark:bg-white/5 rounded-full blur-[50px] pointer-events-none" />
                    <Search size={48} className="relative z-10 mx-auto mb-6 text-gray-300 dark:text-gray-600 drop-shadow-md" />
                    <h3 className="relative z-10 text-xl font-bold text-gray-900 dark:text-white mb-2">No results found</h3>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400 font-medium">No sections match <span className="text-blue-500 font-bold">"{searchQuery}"</span></p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredGroups.map((subject, idx) => {
                        const isExpanded = expandedSubject === subject.code;
                        const totalStudents = subject.sections.reduce((sum, s) => sum + (s.enrolled_count || 0), 0);
                        const totalCapacity = subject.sections.reduce((sum, s) => sum + (s.capacity || 0), 0);
                        const utilization = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

                        return (
                            <motion.div
                                key={subject.code}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`relative rounded-3xl overflow-hidden transition-all duration-500 backdrop-blur-2xl ${isExpanded
                                    ? 'bg-white/60 dark:bg-[#11131e]/80 border border-blue-500/30 shadow-[0_8px_40px_rgba(37,99,235,0.1)] dark:shadow-[0_8px_40px_rgba(37,99,235,0.2)]'
                                    : 'bg-white/40 dark:bg-[#11131e]/50 border border-white/40 dark:border-white/10 hover:border-blue-500/30 dark:hover:border-blue-400/30 hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]'}`}
                            >
                                {/* Subject Header - Clickable */}
                                <button
                                    onClick={() => setExpandedSubject(isExpanded ? null : subject.code)}
                                    className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 text-left group relative z-10"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-red-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    <div className="flex items-center gap-5 md:gap-6 mb-4 md:mb-0 relative z-10">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-all duration-500 ${isExpanded ? 'bg-gradient-to-br from-blue-600 to-red-600 text-white scale-110 shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/80 dark:bg-black/20 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 group-hover:bg-blue-50 dark:group-hover:bg-white/5'}`}>
                                            {subject.code?.slice(0, 3) || '???'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/70 group-hover:from-blue-600 group-hover:to-red-600 dark:group-hover:from-blue-400 dark:group-hover:to-red-400 transition-all duration-300">
                                                {subject.code}
                                            </h3>
                                            <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mt-1">
                                                {subject.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-200 dark:border-white/5 md:border-transparent relative z-10">
                                        {/* Stats Pills */}
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="px-3 md:px-4 py-2 rounded-xl bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/5 flex items-center gap-2 shadow-sm backdrop-blur-md">
                                                <Users size={16} className="text-blue-500 dark:text-blue-400" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                    {totalStudents}<span className="text-gray-400 dark:text-gray-600 font-medium">/</span>{totalCapacity}
                                                </span>
                                            </div>
                                            <div className="px-3 md:px-4 py-2 rounded-xl bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/5 flex items-center gap-2 shadow-sm backdrop-blur-md">
                                                <LayoutDashboard size={16} className="text-blue-500 dark:text-blue-400" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                    {subject.sections.length} <span className="text-gray-500 dark:text-gray-500 text-xs font-medium uppercase tracking-wider ml-1 hidden sm:inline-block">Sections</span>
                                                </span>
                                            </div>
                                        </div>

                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                                            className={`p-2.5 rounded-xl transition-colors duration-300 ${isExpanded ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-blue-50 dark:group-hover:bg-white/10 group-hover:text-blue-500 dark:group-hover:text-white border border-gray-200 dark:border-white/5'}`}
                                        >
                                            <ChevronDown size={20} strokeWidth={3} />
                                        </motion.div>
                                    </div>
                                </button>

                                {/* Sections List - Expandable */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                            className="overflow-hidden bg-gray-50/50 dark:bg-black/20 border-t border-gray-200/50 dark:border-white/5"
                                        >
                                            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {subject.sections.map((section, sIdx) => {
                                                    const percentFull = section.capacity > 0 ? (section.enrolled_count / section.capacity) * 100 : 0;
                                                    const isFull = percentFull >= 100;

                                                    return (
                                                        <motion.div
                                                            key={section.id}
                                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            transition={{ delay: sIdx * 0.05 + 0.1, duration: 0.4 }}
                                                            className="group/section relative rounded-2xl p-5 bg-white/80 dark:bg-[#11131e]/80 backdrop-blur-md border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-red-500/0 group-hover/section:from-blue-500/5 group-hover/section:to-red-500/5 transition-colors duration-500" />
                                                            <div className="absolute -inset-[1px] rounded-2xl border border-transparent group-hover/section:border-blue-500/30 dark:group-hover/section:border-blue-400/30 transition-colors duration-500 pointer-events-none" />

                                                            {/* Header */}
                                                            <div className="flex justify-between items-start mb-5 relative z-10">
                                                                <div>
                                                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] block mb-1.5">Section</span>
                                                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2 group-hover/section:text-blue-600 dark:group-hover/section:text-blue-400 transition-colors">
                                                                        {section.section_number}
                                                                        {isFull && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />}
                                                                    </h4>
                                                                </div>

                                                                {/* Enrollment Badge */}
                                                                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm ${isFull
                                                                    ? 'bg-red-50/80 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                                                    : 'bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                                    }`}>
                                                                    <Users size={12} strokeWidth={3} />
                                                                    <span>{section.enrolled_count || 0}/{section.capacity}</span>
                                                                </div>
                                                            </div>

                                                            {/* Schedules */}
                                                            <div className="space-y-2.5 mb-5 relative z-10 bg-gray-50/50 dark:bg-black/20 p-3.5 rounded-xl border border-gray-100 dark:border-white/5">
                                                                {section.schedules && section.schedules.length > 0 ? (
                                                                    section.schedules.map((schedule, schIdx) => (
                                                                        <div key={schIdx} className="flex items-center gap-2.5 text-sm">
                                                                            <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                                                                <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
                                                                            </div>
                                                                            <span className="font-bold text-gray-700 dark:text-gray-200 capitalize w-10">{schedule.day.slice(0, 3)}</span>
                                                                            <span className="font-medium text-gray-500 dark:text-gray-400">{schedule.start_time} - {schedule.end_time}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="flex items-center gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                                                        <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                                                                            <Calendar size={12} />
                                                                        </div>
                                                                        <span className="italic font-medium">Schedule TBA</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2.5 text-sm pt-1.5 border-t border-gray-200/50 dark:border-white/5 mt-2.5">
                                                                    <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                                                                        <Users size={12} className="text-red-600 dark:text-red-400" />
                                                                    </div>
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">
                                                                        {section.lecturer_name || <span className="italic text-gray-400 dark:text-gray-500">Unassigned Lecturer</span>}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Progress Bar */}
                                                            <div className="relative z-10 w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-6 shadow-inner">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isFull ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`}
                                                                    style={{ width: `${Math.min(percentFull, 100)}%` }}
                                                                >
                                                                    <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" />
                                                                </div>
                                                            </div>

                                                            {/* Actions Overlay */}
                                                            <div className="relative z-10 flex items-center justify-end gap-2 pt-4 border-t border-gray-200/50 dark:border-white/5 bg-gradient-to-t from-white/50 to-transparent dark:from-black/20 dark:to-transparent -mx-5 -mb-5 px-5 pb-5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onViewStudents(section.id); }}
                                                                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/80 dark:bg-black/40 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-gray-200 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/20 transition-all shadow-sm group/btn"
                                                                    title="View Students"
                                                                >
                                                                    <Users size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onEdit(section.id); }}
                                                                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/80 dark:bg-black/40 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm group/btn"
                                                                    title="Edit Section"
                                                                >
                                                                    <Edit size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
                                                                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/80 dark:bg-black/40 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-gray-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/20 transition-all shadow-sm group/btn"
                                                                    title="Delete Section"
                                                                >
                                                                    <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
