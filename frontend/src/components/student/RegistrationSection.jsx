import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, Clock, Filter, Upload, X, ChevronDown, RefreshCw, User } from 'lucide-react';
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
    importing
}) => {
    const [showSubjectImport, setShowSubjectImport] = useState(false);
    const [expandedSubject, setExpandedSubject] = useState(null);

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
                        <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-indigo-500" />
                            Available Courses
                        </h3>
                        {filterActive && (
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-full flex items-center gap-1">
                                <Filter className="w-3 h-3" />
                                {filterCount} subjects filtered
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {filterActive && (
                            <button
                                onClick={clearFilter}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-lg transition"
                            >
                                <X className="w-4 h-4" />
                                Clear Filter
                            </button>
                        )}
                        <button
                            onClick={() => setShowSubjectImport(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-md shadow-indigo-500/20"
                        >
                            <Upload className="w-4 h-4" />
                            Import My Subjects
                        </button>
                    </div>
                </div>

                {subjects.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-500" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {filterActive ? 'No subjects matched your filter' : 'No subjects available'}
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            {filterActive
                                ? 'Try clearing your filter to see all available courses or import a different list.'
                                : 'All courses might be full or registration is currently closed.'}
                        </p>
                        {filterActive && (
                            <button
                                onClick={clearFilter}
                                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline"
                            >
                                Clear filter to see all subjects
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {subjects.map(subject => {
                            const isExpanded = expandedSubject === subject.code;
                            const registeredSections = subject.sections.filter(s => isRegistered(s.section_id));
                            const hasRegistration = registeredSections.length > 0;

                            return (
                                <motion.div
                                    layout
                                    key={subject.code}
                                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    {/* Subject Header - Clickable */}
                                    <button
                                        onClick={() => setExpandedSubject(isExpanded ? null : subject.code)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br shadow-inner ${hasRegistration
                                                ? 'from-green-500 to-emerald-600'
                                                : isExpanded ? 'from-indigo-600 to-purple-600' : 'from-indigo-500 to-indigo-600'
                                                }`}>
                                                {subject.code.slice(0, 3)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                                    {subject.code}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                    {subject.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Semester Badge */}
                                            <span className="hidden sm:inline-flex px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
                                                Sem {subject.subject_semester}
                                            </span>
                                            {/* Prerequisite Warning */}
                                            {subject.prerequisites && subject.prerequisites.length > 0 && (
                                                <span className="hidden sm:inline-flex px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full" title={`Requires: ${subject.prerequisites.join(', ')}`}>
                                                    ⚠️ Prereq
                                                </span>
                                            )}
                                            {hasRegistration && (
                                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                                                    ✓ Registered
                                                </span>
                                            )}
                                            <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500 dark:text-gray-400 min-w-[80px] text-right">
                                                <span>{subject.sections.length} section{subject.sections.length !== 1 ? 's' : ''}</span>
                                                <motion.div
                                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
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
                                                className="border-t border-gray-100 dark:border-gray-700"
                                            >
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                                                    {subject.sections.map(section => {
                                                        const alreadyRegistered = isRegistered(section.section_id);
                                                        const isFull = section.enrolled_count >= section.capacity;

                                                        return (
                                                            <div
                                                                key={section.section_id}
                                                                className={`bg-white dark:bg-gray-800 border rounded-xl p-5 shadow-sm transition-all hover:shadow-md ${alreadyRegistered
                                                                    ? 'border-green-300 dark:border-green-700 ring-1 ring-green-100 dark:ring-green-900/20'
                                                                    : 'border-gray-200 dark:border-gray-700'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div>
                                                                        <span className="font-bold text-gray-800 dark:text-white text-lg">
                                                                            Section {section.section_number}
                                                                        </span>
                                                                    </div>
                                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${section.enrolled_count < section.capacity
                                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                        }`}>
                                                                        {section.enrolled_count}/{section.capacity}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-5">
                                                                    {section.schedules && section.schedules.length > 0 ? (
                                                                        section.schedules.map((sched, idx) => (
                                                                            <div key={idx} className="flex items-center gap-2 flex-wrap bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg">
                                                                                <Calendar className="w-4 h-4 text-indigo-500" />
                                                                                <span className="capitalize font-medium">{sched.day}</span>
                                                                                <Clock className="w-4 h-4 text-indigo-500 ml-2" />
                                                                                <span>{sched.start_time} - {sched.end_time}</span>
                                                                                {sched.room && <span className="text-gray-400 text-xs ml-auto font-mono bg-white dark:bg-gray-600 px-1 rounded">{sched.room}</span>}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <Calendar className="w-4 h-4 text-indigo-500" />
                                                                                <span className="capitalize font-medium">{section.day || 'TBA'}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Clock className="w-4 h-4 text-indigo-500" />
                                                                                <span>{section.start_time && section.end_time ? `${section.start_time} - ${section.end_time}` : 'TBA'}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="pt-2 flex items-center gap-2 text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 mt-2">
                                                                        <User className="w-4 h-4" />
                                                                        <span className="text-xs">{section.lecturer_name || 'TBA'}</span>
                                                                    </div>
                                                                </div>

                                                                {alreadyRegistered ? (
                                                                    <div className="py-2.5 text-center font-bold rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/50 flex items-center justify-center gap-2">
                                                                        <span className="text-lg">✓</span> Registered
                                                                    </div>
                                                                ) : isFull ? (
                                                                    <button
                                                                        onClick={() => onRequestJoin(section.section_id, 'Requesting to join full section')}
                                                                        className="w-full py-2.5 font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition shadow-md shadow-amber-500/20"
                                                                    >
                                                                        Request to Join
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleRegisterClick(section.section_id, subject.prerequisites)}
                                                                        className="w-full py-2.5 font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md shadow-indigo-500/20"
                                                                    >
                                                                        Register Now
                                                                    </button>
                                                                )}
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
