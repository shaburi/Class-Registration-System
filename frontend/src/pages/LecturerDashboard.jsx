import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
    Calendar,
    Users,
    CheckCircle,
    XCircle,
    LogOut,
    RefreshCw,
    BookOpen,
    Clock,
    Printer,
    FileSpreadsheet,
    ChevronDown,
    ChevronUp,
    LayoutGrid
} from 'lucide-react';
import api from '../services/api';
import PrintStudentList from '../components/PrintStudentList';
import { exportStudentsToExcel } from '../utils/excelExport';
import DashboardLayout from '../components/DashboardLayout';
import StatsCard from '../components/StatsCard';

export default function LecturerDashboard() {
    const { user, logout } = useAuth();
    const [sections, setSections] = useState([]);
    const [stats, setStats] = useState({ totalSections: 0, totalStudents: 0, totalCreditHours: 0 });
    const [loading, setLoading] = useState(true);
    const [printMode, setPrintMode] = useState(false);
    const [printSection, setPrintSection] = useState(null);
    const [printStudents, setPrintStudents] = useState([]);
    const [activeTab, setActiveTab] = useState('students');
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [expandedSection, setExpandedSection] = useState(null);
    const [sectionStudents, setSectionStudents] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const [sectionsRes, statsRes] = await Promise.all([
                api.get('/lecturer/sections'),
                api.get('/lecturer/stats')
            ]);

            setSections(sectionsRes.data.data || sectionsRes.data);
            setStats(statsRes.data.data || statsRes.data);
        } catch (error) {
            console.error('[LECTURER] Error loading data:', error);
            alert('Failed to load lecturer data. Please try refreshing.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewStudents = async (sectionId) => {
        if (expandedSection === sectionId) {
            setExpandedSection(null);
            return;
        }

        try {
            // Check if we already have the students loaded
            if (!sectionStudents[sectionId]) {
                const response = await api.get(`/lecturer/sections/${sectionId}/students`);
                const students = response.data.data || response.data || [];
                setSectionStudents(prev => ({ ...prev, [sectionId]: students }));
            }
            setExpandedSection(sectionId);
        } catch (error) {
            console.error('Failed to load students:', error);
            alert('Failed to load students: ' + (error.response?.data?.message || error.message));
        }
    };

    const handlePrintStudents = async (sectionId) => {
        try {
            let students = sectionStudents[sectionId];
            if (!students) {
                const response = await api.get(`/lecturer/sections/${sectionId}/students`);
                students = response.data.data || response.data || [];
                setSectionStudents(prev => ({ ...prev, [sectionId]: students }));
            }
            const section = sections.find(s => s.id === sectionId);

            setPrintSection(section);
            setPrintStudents(students);
            setPrintMode(true);
        } catch (error) {
            console.error('Failed to load students for printing:', error);
            alert('Failed to load students: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleExportExcel = async (sectionId) => {
        try {
            let students = sectionStudents[sectionId];
            if (!students) {
                const response = await api.get(`/lecturer/sections/${sectionId}/students`);
                students = response.data.data || response.data || [];
                setSectionStudents(prev => ({ ...prev, [sectionId]: students }));
            }
            const section = sections.find(s => s.id === sectionId);

            exportStudentsToExcel(section, students);
        } catch (error) {
            console.error('Failed to export students:', error);
            alert('Failed to export: ' + (error.response?.data?.message || error.message));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-green-600 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const totalStudents = sections.reduce((sum, s) => sum + (s.enrolled_count || 0), 0);
    const totalCreditHours = sections.reduce((sum, s) => sum + (s.credit_hours || 0), 0);

    const displayName = user?.displayName || user?.student_name || user?.studentName || user?.lecturerName || user?.lecturer_name || user?.name || user?.email?.split('@')[0] || 'Lecturer';
    const headerContent = (
        <div className="flex flex-col gap-2 relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-1 font-heading tracking-tight text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-lg">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 dark:from-blue-400 dark:via-red-400 dark:to-blue-400 animate-gradient-x">
                    Welcome back
                </span>
                , {displayName}
            </h2>
            <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                <p>Here is what's happening today.</p>
                <div className="hidden md:block w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                <div className="hidden md:block text-[11px] font-bold uppercase tracking-widest opacity-80 text-gray-500">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout
            role="lecturer"
            title="Lecturer Dashboard"
            activeTab={activeTab}
            onTabChange={setActiveTab}
            headerContent={headerContent}
        >
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <StatsCard
                    icon={<BookOpen className="w-6 h-6" />}
                    title="Teaching Sections"
                    value={sections.length}
                    color="green"
                />
                <StatsCard
                    icon={<Users className="w-6 h-6" />}
                    title="Total Students"
                    value={totalStudents}
                    color="teal"
                />
                <StatsCard
                    icon={<Clock className="w-6 h-6" />}
                    title="Credit Hours"
                    value={totalCreditHours}
                    color="cyan"
                />
            </div>

            {/* Tab: My Sections (List View) */}
            {activeTab === 'students' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                My Sections
                            </h2>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium dark:bg-green-900/30 dark:text-green-400">
                                {sections.length} Sections
                            </span>
                        </div>

                        {sections.length === 0 ? (
                            <div className="text-center py-12">
                                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No sections assigned yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(() => {
                                    // Group sections by subject
                                    const groupedSections = sections.reduce((acc, section) => {
                                        const key = section.subject_code;
                                        if (!acc[key]) {
                                            acc[key] = {
                                                code: section.subject_code,
                                                name: section.subject_name,
                                                sections: []
                                            };
                                        }
                                        acc[key].sections.push(section);
                                        return acc;
                                    }, {});

                                    return Object.values(groupedSections).map(subject => {
                                        const isSubjectExpanded = expandedSubject === subject.code;
                                        const totalStudents = subject.sections.reduce((sum, s) => sum + (s.enrolled_count || 0), 0);

                                        return (
                                            <div key={subject.code} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                                                {/* Subject Header - Clickable */}
                                                <button
                                                    onClick={() => setExpandedSubject(isSubjectExpanded ? null : subject.code)}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br from-green-500 to-teal-600">
                                                            {subject.code.slice(0, 3)}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 dark:text-white">
                                                                {subject.code}
                                                            </h3>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {subject.name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-medium rounded-full">
                                                            {totalStudents} students
                                                        </span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            {subject.sections.length} section{subject.sections.length > 1 ? 's' : ''}
                                                        </span>
                                                        <motion.div
                                                            animate={{ rotate: isSubjectExpanded ? 180 : 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                                        </motion.div>
                                                    </div>
                                                </button>

                                                {/* Sections List - Expandable */}
                                                <AnimatePresence>
                                                    {isSubjectExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="border-t border-gray-100 dark:border-gray-700"
                                                        >
                                                            <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                                                                {subject.sections.map(section => (
                                                                    <div
                                                                        key={section.id}
                                                                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                                                                    >
                                                                        {/* Section Header */}
                                                                        <div className="p-4">
                                                                            <div className="flex justify-between items-start">
                                                                                <div className="flex-1">
                                                                                    <div className="flex items-center gap-3 mb-2">
                                                                                        <span className="font-semibold text-gray-800 dark:text-white">
                                                                                            Section {section.section_number}
                                                                                        </span>
                                                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${section.enrolled_count >= section.capacity
                                                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                                            }`}>
                                                                                            {section.enrolled_count || 0}/{section.capacity}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                                                                                        <span className="capitalize">{section.day}</span>
                                                                                        <span>{section.start_time} - {section.end_time}</span>
                                                                                        <span>Room: {section.room}</span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Action Buttons */}
                                                                                <div className="flex gap-2">
                                                                                    <button
                                                                                        onClick={() => handlePrintStudents(section.id)}
                                                                                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition dark:bg-gray-700 dark:hover:bg-gray-600"
                                                                                        title="Print Student List"
                                                                                    >
                                                                                        <Printer className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleExportExcel(section.id)}
                                                                                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition dark:bg-gray-700 dark:hover:bg-gray-600"
                                                                                        title="Download Excel"
                                                                                    >
                                                                                        <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleViewStudents(section.id)}
                                                                                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition dark:bg-gray-700 dark:hover:bg-gray-600"
                                                                                        title="View Students"
                                                                                    >
                                                                                        {expandedSection === section.id ? (
                                                                                            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                                                        ) : (
                                                                                            <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Expanded Students List */}
                                                                        <AnimatePresence>
                                                                            {expandedSection === section.id && (
                                                                                <motion.div
                                                                                    initial={{ height: 0, opacity: 0 }}
                                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                                    exit={{ height: 0, opacity: 0 }}
                                                                                    className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4"
                                                                                >
                                                                                    {!sectionStudents[section.id] ? (
                                                                                        <div className="flex items-center justify-center py-4">
                                                                                            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                                                                            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
                                                                                        </div>
                                                                                    ) : sectionStudents[section.id].length === 0 ? (
                                                                                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                                                                            <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                                                                            <p className="text-sm">No students enrolled</p>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="overflow-x-auto">
                                                                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                                                                <thead className="bg-gray-100 dark:bg-gray-800">
                                                                                                    <tr>
                                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">No.</th>
                                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Student ID</th>
                                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Name</th>
                                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Programme</th>
                                                                                                    </tr>
                                                                                                </thead>
                                                                                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                                                                                    {sectionStudents[section.id].map((student, index) => (
                                                                                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                                                                            <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{index + 1}</td>
                                                                                                            <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">{student.student_id}</td>
                                                                                                            <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-200">{student.student_name}</td>
                                                                                                            <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{student.programme}</td>
                                                                                                        </tr>
                                                                                                    ))}
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </div>
                                                                                    )}
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: My Schedule (Timetable) */}
            {activeTab === 'schedule' && (
                <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-gray-800">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 dark:text-white">
                        My Teaching Schedule
                    </h2>

                    <TimetableView sections={sections} onPrint={handlePrintStudents} onExport={handleExportExcel} />
                </div>
            )}

            {/* Print Modal */}
            {
                printMode && (
                    <div className="fixed inset-0 bg-white z-50">
                        <PrintStudentList
                            section={printSection}
                            students={printStudents}
                            onClose={() => setPrintMode(false)}
                        />
                    </div>
                )
            }
        </DashboardLayout>
    );
}


// Helper for consistent colors
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
        'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-100',
        'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-100',
        'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100',
        'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:border-fuchsia-700 dark:text-fuchsia-100',
        'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-100',
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

// Timetable Grid View Component
function TimetableView({ sections, onPrint, onExport }) {
    // Days and Time Config
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const startHour = 8;
    const endHour = 22; // 10 PM
    const totalPeriods = endHour - startHour; // 14 hours

    // Generate Periods for Header
    const periods = React.useMemo(() => {
        return Array.from({ length: totalPeriods }, (_, i) => {
            const hour = startHour + i;
            const h = hour % 12 || 12;
            const ampm = hour < 12 ? 'AM' : 'PM';
            const nextHour = hour + 1;
            const nextH = nextHour % 12 || 12;
            const nextAmpm = nextHour < 12 ? 'AM' : 'PM';

            return {
                id: i,
                hour: hour,
                name: `${h}`,
                starttime: `${h}:00 ${ampm}`,
                endtime: `${nextH}:00 ${nextAmpm}`
            };
        });
    }, []);

    // Process Sections into Events with Layout Logic
    const timetableData = React.useMemo(() => {
        const eventsByDay = {};
        const grid = {}; // day -> periodIndex -> items[]

        days.forEach(day => {
            eventsByDay[day] = [];
            grid[day] = {};
            for (let i = 0; i < totalPeriods; i++) {
                grid[day][i] = [];
            }
        });

        // 1. Map sections to event objects
        sections.forEach(sec => {
            if (!sec.day) return;
            const dayName = sec.day.charAt(0).toUpperCase() + sec.day.slice(1).toLowerCase();
            if (!grid[dayName]) return;

            const startH = parseInt(sec.start_time?.split(':')[0]) || 8;
            const endH = parseInt(sec.end_time?.split(':')[0]) || startH + 1;

            const startIndex = startH - startHour;
            const duration = Math.max(1, endH - startH);

            if (startIndex < 0 || startIndex >= totalPeriods) return;

            const event = {
                ...sec,
                startIndex,
                duration,
                trackIndex: 0,
                totalTracks: 1
            };

            for (let i = startIndex; i < startIndex + duration; i++) {
                if (grid[dayName][i]) {
                    grid[dayName][i].push(event);
                }
            }
            eventsByDay[dayName].push(event);
        });

        // 2. Calculate Tracks (Collision Detection)
        days.forEach(day => {
            const dayEvents = eventsByDay[day];
            if (dayEvents.length === 0) return;

            dayEvents.sort((a, b) => {
                if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
                return b.duration - a.duration;
            });

            const tracks = [];

            dayEvents.forEach(event => {
                let placed = false;
                for (let i = 0; i < tracks.length; i++) {
                    if (tracks[i] <= event.startIndex) {
                        event.trackIndex = i;
                        tracks[i] = event.startIndex + event.duration;
                        placed = true;
                        break;
                    }
                }

                if (!placed) {
                    event.trackIndex = tracks.length;
                    tracks.push(event.startIndex + event.duration);
                }
            });

            eventsByDay[day].neededTracks = tracks.length;
        });

        return { eventsByDay };
    }, [sections, days]);

    return (
        <div className="pb-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
            <div className="min-w-[800px]">
                {/* Header Row */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                    <div className="w-24 flex-shrink-0 p-2 border-r border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-0 z-10 bg-gray-100 dark:bg-gray-700">
                        Day
                    </div>
                    <div className="flex-1 flex relative">
                        {periods.map(period => (
                            <div key={period.id} className="flex-1 border-r border-gray-200 dark:border-gray-600 p-1 text-center min-w-[60px]">
                                <div className="font-bold text-xs text-gray-700 dark:text-gray-300">{period.name}</div>
                                <div className="text-[10px] text-gray-500 font-normal whitespace-nowrap">{period.starttime}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Day Rows */}
                {days.map(day => {
                    const events = timetableData.eventsByDay[day] || [];
                    const neededTracks = events.neededTracks || 1;
                    const trackHeight = 85;
                    const rowHeight = Math.max(trackHeight, neededTracks * trackHeight);

                    return (
                        <div key={day} className="flex border-b border-gray-200 dark:border-gray-700 relative group">
                            <div
                                className="w-24 flex-shrink-0 p-4 border-r border-gray-200 dark:border-gray-600 font-bold text-gray-700 dark:text-gray-300 sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 uppercase tracking-wider text-xs flex items-center justify-center"
                                style={{ height: `${rowHeight}px` }}
                            >
                                {day.substring(0, 3)}
                            </div>

                            <div className="flex-1 relative bg-gray-50/50 dark:bg-gray-800/50" style={{ height: `${rowHeight}px` }}>
                                {/* Grid Lines */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {periods.map(p => (
                                        <div key={p.id} className="flex-1 border-r border-gray-200/50 dark:border-gray-600/30 h-full border-dashed" />
                                    ))}
                                </div>

                                {/* Event Cards */}
                                {events.map((event, idx) => {
                                    const widthPercent = (event.duration / totalPeriods) * 100;
                                    const leftPercent = (event.startIndex / totalPeriods) * 100;
                                    const topPos = event.trackIndex * trackHeight;
                                    const colorClass = getSubjectColor(event.subject_code);

                                    return (
                                        <motion.div
                                            key={event.id || idx}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.05, zIndex: 50 }}
                                            className="absolute p-0.5 transition-all duration-200 group/card"
                                            style={{
                                                left: `${leftPercent}%`,
                                                width: `${widthPercent}%`,
                                                top: `${topPos}px`,
                                                height: `${trackHeight}px`
                                            }}
                                        >
                                            <div className={`
                                                h-full w-full rounded shadow-sm border-l-[3px] ${colorClass} 
                                                text-xs flex flex-col justify-between p-1.5 overflow-hidden
                                                relative cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-opacity-50 ring-blue-500
                                            `}>
                                                <div className="font-bold text-[11px] leading-tight mb-1 break-words whitespace-normal" title={event.subject_name}>
                                                    {event.subject_code}
                                                </div>

                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold bg-white/30 px-1 rounded text-[9px]">
                                                        Sec {event.section_number}
                                                    </span>
                                                </div>

                                                <div className="mt-auto space-y-0.5">
                                                    <div className="flex items-center gap-1 opacity-90 text-[10px] truncate">
                                                        <span className="truncate">📍 {event.room || 'TBA'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-80 text-[10px] truncate">
                                                        <Users className="w-2.5 h-2.5 flex-shrink-0" />
                                                        <span className="truncate">{event.enrolled_count}/{event.capacity} Students</span>
                                                    </div>
                                                </div>

                                                <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/50 dark:bg-black/20 p-0.5 rounded backdrop-blur-sm">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onPrint(event.id); }}
                                                        className="p-1 bg-white/50 hover:bg-white/80 rounded shadow-sm backdrop-blur-sm transition-all hover:scale-110"
                                                        title="Print Student List"
                                                    >
                                                        <Printer size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onExport(event.id); }}
                                                        className="p-1 bg-white/50 hover:bg-white/80 rounded shadow-sm backdrop-blur-sm transition-all hover:scale-110"
                                                        title="Download Excel"
                                                    >
                                                        <FileSpreadsheet size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
