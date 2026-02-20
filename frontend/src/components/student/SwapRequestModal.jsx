import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, X, AlertCircle, Calendar, Clock, RefreshCw, User } from 'lucide-react';
import api from '../../services/api';

const SwapRequestModal = ({ isOpen, onClose, selectedRegistration, swapSections, onConfirmSwap }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <ArrowRightLeft className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Request Section Swap</h3>
                            <p className="text-sm opacity-90">
                                {selectedRegistration?.subject_code} - {selectedRegistration?.subject_name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-600 dark:text-blue-300 font-semibold uppercase tracking-wider">Current Section</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-bold">Section {selectedRegistration?.section_number}</span>
                                <span className="mx-2">•</span>
                                {selectedRegistration?.day} {selectedRegistration?.start_time}-{selectedRegistration?.end_time}
                            </p>
                        </div>
                    </div>

                    <h4 className="font-semibold text-gray-800 mb-4 dark:text-white flex items-center gap-2">
                        Available Sections for Swap
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {swapSections.length} available
                        </span>
                    </h4>

                    {swapSections.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No other sections available for this subject</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {swapSections.map(section => (
                                <SwapSectionCard
                                    key={section.section_id}
                                    section={section}
                                    onSelectStudent={onConfirmSwap}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// Swap Section Card Component
function SwapSectionCard({ section, onSelectStudent }) {
    const [expanded, setExpanded] = useState(false);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadStudents = async () => {
        if (expanded) {
            setExpanded(false);
            return;
        }

        if (students.length > 0) {
            setExpanded(true);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/student/sections/${section.section_id}/students`);
            setStudents(response.data.data || response.data || []);
            setExpanded(true);
        } catch (error) {
            console.error('Failed to load students:', error);
            // toast.error('Failed to load students in this section'); // Use toast if available or just alert
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden dark:border-gray-700 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
            <button
                onClick={loadStudents}
                className="w-full p-4 hover:bg-gray-50 transition text-left dark:hover:bg-gray-700/50 flex justify-between items-center group"
            >
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-800 dark:text-white text-lg">
                            Section {section.section_number}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${section.enrolled_count < section.capacity
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {section.enrolled_count}/{section.capacity} Enrolled
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300 mt-2">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="capitalize">{section.day}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {section.start_time} - {section.end_time}
                        </span>
                        <span className="flex items-center gap-1.5 md:ml-auto">
                            <span className="text-gray-400">Room:</span> {section.room}
                        </span>
                    </div>
                </div>
                <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700 transition-transform duration-200 ${expanded ? 'rotate-180' : ''} group-hover:bg-gray-200 dark:group-hover:bg-gray-600 ml-4`}>
                    <div className="w-4 h-4 flex items-center justify-center">▼</div>
                </div>
            </button>

            {expanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-gray-200 bg-gray-50/50 p-4 dark:bg-gray-900/50 dark:border-gray-700"
                >
                    {loading ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500" />
                            <p>Loading classmates...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No students registered in this section yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Select a student to request swap:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {students.map(student => (
                                    <motion.button
                                        key={student.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onSelectStudent(student.id, section.section_id)}
                                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-cyan-500 hover:shadow-md hover:shadow-cyan-500/10 transition text-left dark:bg-gray-800 dark:border-gray-600 dark:hover:border-cyan-400"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                            {student.student_name?.charAt(0) || 'S'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{student.student_name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{student.student_id}</p>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

export default SwapRequestModal;
