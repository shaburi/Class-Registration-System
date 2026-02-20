import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, Clock, Filter, Upload, X, ChevronDown, RefreshCw, User, Search } from 'lucide-react';
import CourseRecommendations from '../CourseRecommendations';
import CSVImportModal from '../CSVImportModal';
import { useAuth } from '../../contexts/AuthContext'; // Assuming context path

const RegistrationSection = ({
    availableSections,
    registrations,
    subjectFilter,
    onRegister,
    onRequestJoin,
    importSubjects,
    clearFilter,
    importing,
    semesterFilter,
    setSemesterFilter,
    currentSemester = 3 // Default to 3 if not provided
}) => {
    const [showSubjectImport, setShowSubjectImport] = useState(false);
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter sections based on imported subject codes if filter is active
    const filteredSections = subjectFilter.length > 0
        ? availableSections.filter(s => subjectFilter.includes(s.code))
        : availableSections;

    // Check if student is already registered for a section
    const isRegistered = (sectionId) => registrations.some(reg => reg.section_id === sectionId);

    // Group sections by subject code
    const groupedSections = filteredSections.reduce((acc, section) => {
        const key = section.code;
        if (!acc[key]) {
            acc[key] = {
                code: section.code,
                name: section.name,
                credit_hours: section.credit_hours,
                prerequisites: section.prerequisites || [],
                subject_semester: section.subject_semester,
                sections: []
            };
        }
        acc[key].sections.push(section);
        return acc;
    }, {});

    const subjects = Object.values(groupedSections);

    // Sort subjects: registered ones first
    const sortedSubjects = [...subjects].sort((a, b) => {
        const aHasRegistration = a.sections.some(s => isRegistered(s.section_id));
        const bHasRegistration = b.sections.some(s => isRegistered(s.section_id));
        if (aHasRegistration && !bHasRegistration) return -1;
        if (!aHasRegistration && bHasRegistration) return 1;
        return 0;
    });

    // Filter subjects by search query
    const searchFilteredSubjects = searchQuery.trim()
        ? sortedSubjects.filter(subject =>
            subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            subject.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : sortedSubjects;

    const filterActive = subjectFilter.length > 0;
    const filterCount = subjectFilter.length;

    const handleRegisterClick = (sectionId, prerequisites) => {
        // Prerequisite check moved to UI layer
        if (prerequisites && prerequisites.length > 0) {
            const prereqList = prerequisites.join(', ');
            const confirmed = window.confirm(
                `⚠️ PREREQUISITE REQUIRED\n\n` +
                `This subject requires you to have PASSED: ${prereqList}\n\n` +
                `Have you passed ${prereqList}?\n\n` +
                `Click OK if YES, Cancel if NO.`
            );
            if (!confirmed) return;
        }
        onRegister(sectionId);
    };

    const handleImportWrapper = async (data) => {
        const success = await importSubjects(data);
        if (success) setShowSubjectImport(false);
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <CourseRecommendations />

            <div className="mt-8">
                {/* Header with Import Button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-inner">
                            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="font-bold text-2xl text-gray-900 dark:text-white font-heading tracking-tight drop-shadow-sm dark:drop-shadow-md">
                            Available Courses
                        </h3>
                        {filterActive && (
                            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                <Filter className="w-3 h-3" />
                                {filterCount} filters
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        {filterActive && (
                            <button
                                onClick={clearFilter}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white border border-gray-200 dark:border-white/10 rounded-xl transition-all duration-300 font-medium text-sm"
                            >
                                <X className="w-4 h-4" />
                                Clear Filter
                            </button>
                        )}
                        <button
                            onClick={() => setShowSubjectImport(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] font-bold text-sm border border-indigo-400/50 group"
                        >
                            <Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                            Import My Subjects
                        </button>
                    </div>
                </div>

                {/* Semester Filter */}
                {setSemesterFilter && (
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Show subjects from:</span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSemesterFilter('current')}
                                className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all duration-300 ${semesterFilter === 'current'
                                    ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400'
                                    : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-800 dark:hover:text-white'
                                    }`}
                            >
                                Semester {currentSemester} (Current)
                            </button>
                            <button
                                onClick={() => setSemesterFilter('all')}
                                className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all duration-300 ${semesterFilter === 'all'
                                    ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400'
                                    : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-800 dark:hover:text-white'
                                    }`}
                            >
                                All Semesters
                            </button>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].filter(s => s !== currentSemester).map(sem => (
                                <button
                                    key={sem}
                                    onClick={() => setSemesterFilter(sem.toString())}
                                    className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all duration-300 ${semesterFilter === sem.toString()
                                        ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400'
                                        : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-800 dark:hover:text-white'
                                        }`}
                                >
                                    Sem {sem}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search courses by code or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-12 py-3.5 bg-white/80 dark:bg-[#07090e]/80 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] dark:focus:shadow-[0_0_20px_rgba(99,102,241,0.2)] shadow-inner transition-all font-medium"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {searchFilteredSubjects.length === 0 ? (
                    <div className="text-center py-16 glass-card rounded-3xl border border-[var(--glass-border)]">
                        <div className="w-20 h-20 bg-[var(--bg-secondary)]/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            {searchQuery ? <Search className="w-10 h-10 text-gray-300 dark:text-gray-500" /> : <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-500" />}
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {searchQuery ? `No courses found for "${searchQuery}"` : filterActive ? 'No subjects matched your filter' : 'No subjects available'}
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            {searchQuery
                                ? 'Try a different search term or clear the search.'
                                : filterActive
                                    ? 'Try clearing your filter to see all available courses or import a different list.'
                                    : 'All courses might be full or registration is currently closed.'}
                        </p>
                        {(filterActive || searchQuery) && (
                            <div className="flex justify-center gap-3">
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline"
                                    >
                                        Clear search
                                    </button>
                                )}
                                {filterActive && (
                                    <button
                                        onClick={clearFilter}
                                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline"
                                    >
                                        Clear filter
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {searchFilteredSubjects.map(subject => {
                            const isExpanded = expandedSubject === subject.code;
                            const registeredSections = subject.sections.filter(s => isRegistered(s.section_id));
                            const hasRegistration = registeredSections.length > 0;

                            return (
                                <motion.div
                                    layout
                                    key={subject.code}
                                    className="bg-white/80 dark:bg-[#0b0d14]/80 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 rounded-[24px] overflow-hidden hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:border-gray-300 dark:hover:border-white/10 transition-all duration-300 group/accordion"
                                >
                                    {/* Subject Header - Clickable */}
                                    <button
                                        onClick={() => setExpandedSubject(isExpanded ? null : subject.code)}
                                        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-gray-900 dark:text-white text-lg bg-gradient-to-br shadow-inner border border-gray-200/50 dark:border-white/10 transition-all duration-300 ${hasRegistration
                                                ? 'from-green-100 to-emerald-200 dark:from-green-500 dark:to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                                : isExpanded ? 'from-purple-200 to-indigo-200 dark:from-purple-600 dark:to-indigo-600 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'from-gray-100 to-gray-50 dark:from-[#1a1d29] dark:to-[#0d0f18] text-gray-600 dark:text-gray-300 group-hover/accordion:border-gray-300 dark:group-hover/accordion:border-white/20'
                                                }`}>
                                                {subject.code.slice(0, 3)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white font-heading tracking-tight text-xl mb-1">
                                                    {subject.code}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium line-clamp-1">
                                                    {subject.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {/* Semester Badge */}
                                            <span className="hidden sm:inline-flex px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded-full">
                                                Sem {subject.subject_semester}
                                            </span>
                                            {/* Prerequisite Warning */}
                                            {subject.prerequisites && subject.prerequisites.length > 0 && (
                                                <span className="hidden sm:inline-flex px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]" title={`Requires: ${subject.prerequisites.join(', ')}`}>
                                                    ⚠️ Prereq
                                                </span>
                                            )}
                                            {hasRegistration && (
                                                <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]">
                                                    ✓ Registered
                                                </span>
                                            )}
                                            <div className="flex flex-col items-end sm:flex-row sm:items-center gap-2 sm:gap-5 text-sm text-gray-500 min-w-[80px] text-right">
                                                <span className="font-medium text-xs uppercase tracking-wider">{subject.sections.length} section{subject.sections.length !== 1 ? 's' : ''}</span>
                                                <motion.div
                                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hidden sm:flex items-center justify-center border border-gray-200 dark:border-white/5 group-hover/accordion:bg-black/10 dark:group-hover/accordion:bg-white/10 transition-colors"
                                                >
                                                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover/accordion:text-gray-900 dark:group-hover/accordion:text-white" />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Sections List - Expandable */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                                className="border-t border-[var(--glass-border)]"
                                            >
                                                <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5 bg-white/50 dark:bg-[#07090e]/50 border-t border-gray-200/50 dark:border-white/5 relative shadow-inner">
                                                    <div className="absolute inset-0 bg-gradient-to-b from-gray-100/50 to-transparent dark:from-black/20 dark:to-transparent pointer-events-none"></div>
                                                    {subject.sections.map(section => {
                                                        const alreadyRegistered = isRegistered(section.section_id);
                                                        const isFull = section.enrolled_count >= section.capacity;

                                                        return (
                                                            <div
                                                                key={section.section_id}
                                                                className={`relative rounded-[20px] p-6 transition-all duration-300 group overflow-hidden ${alreadyRegistered
                                                                    ? 'bg-green-50/50 dark:bg-green-900/10 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.05)]'
                                                                    : 'bg-white/60 dark:bg-[#1a1d29]/60 border border-gray-200 dark:border-white/5 hover:border-indigo-300/50 dark:hover:border-indigo-500/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]'
                                                                    }`}
                                                            >
                                                                {/* Background glow effect on hover */}
                                                                {!alreadyRegistered && <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>}

                                                                <div className="flex justify-between items-start mb-5 relative z-10">
                                                                    <div>
                                                                        <span className="font-bold text-gray-900 dark:text-white text-xl font-heading tracking-tight">
                                                                            Section {section.section_number}
                                                                        </span>
                                                                    </div>
                                                                    <span className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold border ${section.enrolled_count < section.capacity
                                                                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]'
                                                                        : 'border-red-500/30 text-red-400 bg-red-500/10 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]'
                                                                        }`}>
                                                                        {section.enrolled_count}/{section.capacity}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400 mb-6 relative z-10">
                                                                    {section.schedules && section.schedules.length > 0 ? (
                                                                        section.schedules.map((sched, idx) => (
                                                                            <div key={idx} className="flex items-center justify-between bg-gray-50/50 dark:bg-[#07090e]/50 border border-gray-200/50 dark:border-white/5 p-3 rounded-xl hover:border-gray-300 dark:group-hover:border-white/10 transition-colors">
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                                                                        <span className="capitalize font-medium text-gray-700 dark:text-gray-300">{sched.day}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                                                                        <span className="text-gray-600 dark:text-gray-300">{sched.start_time} - {sched.end_time}</span>
                                                                                    </div>
                                                                                </div>
                                                                                {sched.room && <span className="text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-widest bg-black/5 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 px-2 py-1 rounded-md">{sched.room}</span>}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="bg-gray-50/50 dark:bg-[#07090e]/50 border border-gray-200/50 dark:border-white/5 p-3 rounded-xl flex items-center justify-between">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                                                                    <span className="capitalize font-medium text-gray-700 dark:text-gray-300">{section.day || 'TBA'}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                                                                    <span className="text-gray-600 dark:text-gray-300">{section.start_time && section.end_time ? `${section.start_time} - ${section.end_time}` : 'TBA'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="pt-3 flex items-center gap-3 text-gray-400 border-t border-gray-200/50 dark:border-white/5 mt-3">
                                                                        <User className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                                                                        <span className="text-xs font-semibold tracking-wide uppercase">{section.lecturer_name || 'TBA'}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="relative z-10">
                                                                    {alreadyRegistered ? (
                                                                        <div className="py-3 mt-2 text-center font-bold tracking-widest uppercase text-[11px] rounded-[14px] bg-green-500/10 text-green-400 border border-green-500/30 flex items-center justify-center gap-2 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]">
                                                                            <span className="text-sm">✓</span> Registered
                                                                        </div>
                                                                    ) : isFull ? (
                                                                        <button
                                                                            onClick={() => onRequestJoin(section.section_id, 'Requesting to join full section')}
                                                                            className="w-full py-3.5 mt-2 font-bold tracking-widest uppercase text-[11px] rounded-[14px] relative overflow-hidden group/btn border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                                                        >
                                                                            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                                                Request to Join
                                                                            </span>
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleRegisterClick(section.section_id, subject.prerequisites)}
                                                                            className="w-full py-3.5 mt-2 font-bold tracking-widest uppercase text-[11px] rounded-[14px] relative overflow-hidden group/btn border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                                                                        >
                                                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                                                Register Now
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
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
            </div>

            {/* CSV Import Modal for Subject Filter */}
            <CSVImportModal
                isOpen={showSubjectImport}
                onClose={() => setShowSubjectImport(false)}
                title="Import My Subjects"
                description="Upload a CSV with subject codes to filter your available courses"
                templateColumns={['subject_code']}
                sampleData={[
                    { subject_code: 'SWC2032' },
                    { subject_code: 'ESK5103' },
                    { subject_code: 'DBC2031' }
                ]}
                requiredColumns={['subject_code']}
                onImport={handleImportWrapper}
                importing={importing}
            />
        </motion.div>
    );
};

export default RegistrationSection;
