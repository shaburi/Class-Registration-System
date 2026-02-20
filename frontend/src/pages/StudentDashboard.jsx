import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useStudentData } from '../hooks/useStudentData';
import StatsOverview from '../components/student/StatsOverview';
import TimetableSection from '../components/student/TimetableSection';
import TimetableBuilder from '../components/student/TimetableBuilder';
import RegistrationSection from '../components/student/RegistrationSection';
import RequestSection from '../components/student/RequestSection';
import SwapRequestModal from '../components/student/SwapRequestModal';
import DropModal from '../components/student/DropModal';
import { useAuth } from '../contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { showGlassToast } from '../components/GlassToast';

import { motion } from 'framer-motion';
import {
    Calendar, RefreshCw, GraduationCap, User, Search,
    Clock, MapPin, Sparkles, Trash2, Building2
} from 'lucide-react';
import api from '../services/api';

// Helper to get consistent color for a subject code (UPTM Brand Colors)
const getSubjectColor = (code) => {
    const colors = [
        'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100',
        'bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-100', // Keeps navy tone
        'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100',
        'bg-gray-100 border-gray-300 text-gray-900 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-100',
        'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-100', // Warning/accent
        'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
        'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
    ];

    if (!code) return colors[0];

    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export default function StudentDashboard() {
    const { user } = useAuth();
    const {
        loading,
        registrations,
        availableSections,
        swapRequests,
        manualRequests,
        dropRequests,
        subjectFilter,
        importing,
        semesterFilter,
        setSemesterFilter,
        registerCourse,
        dropCourse,
        requestSwap,
        respondToSwap,
        requestManualJoin,
        importSubjects,
        clearFilter,
        refreshData
    } = useStudentData();

    // UI State
    const [activeTab, setActiveTab] = useState('timetable');

    // Modal States
    const [swapModalOpen, setSwapModalOpen] = useState(false);
    const [dropModalOpen, setDropModalOpen] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);

    // Semester Timetable State  
    const [semesterSections, setSemesterSections] = useState([]);
    const [semesterLoading, setSemesterLoading] = useState(false);

    // aSC Data from DATABASE (edupage_timetables table)
    const [ascData, setAscData] = useState(null);
    const [ascLoading, setAscLoading] = useState(false);

    // Programme Schedules State
    const [selectedClass, setSelectedClass] = useState(null);

    // Lecturer Schedules State  
    const [selectedLecturer, setSelectedLecturer] = useState(null);
    const [lecturerSearch, setLecturerSearch] = useState('');

    // Timetable Builder State
    const [selectedBuilderSections, setSelectedBuilderSections] = useState([]);
    const [isRegistering, setIsRegistering] = useState(false);


    // Animations
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 10
            }
        }
    };

    // Load semester timetable when tab is active
    useEffect(() => {
        if (activeTab === 'semester-view' || activeTab === 'builder') {
            if (semesterSections.length === 0) {
                loadSemesterTimetable();
            }
        }
    }, [activeTab]);

    // Load aSC data from DATABASE for Programme/Lecturer/Builder views
    useEffect(() => {
        if ((activeTab === 'programme-schedules' || activeTab === 'lecturer-schedules' || activeTab === 'builder') && !ascData) {
            loadAscDataFromDB();
        }
    }, [activeTab]);


    const loadSemesterTimetable = async () => {
        setSemesterLoading(true);
        try {
            const response = await api.get('/student/semester-timetable');
            const sections = response.data?.data?.sections || response.data?.sections || [];
            setSemesterSections(Array.isArray(sections) ? sections : []);
        } catch (error) {
            console.error('Failed to load semester timetable:', error);
            setSemesterSections([]);
        } finally {
            setSemesterLoading(false);
        }
    };

    // This reads from DATABASE (edupage_timetables table), NOT from aSC API
    const loadAscDataFromDB = async () => {
        setAscLoading(true);
        try {
            const response = await api.get('/student/asc-timetable');
            setAscData(response.data?.data || null);
        } catch (error) {
            console.error('Failed to load timetable data from database:', error);
            setAscData(null);
        } finally {
            setAscLoading(false);
        }
    };

    // Handlers
    const handleSwapClick = (regId) => {
        const reg = registrations.find(r => r.registration_id === regId);
        if (reg) {
            setSelectedRegistration(reg);
            setSwapModalOpen(true);
        }
    };

    const handleDropClick = (regId) => {
        const reg = registrations.find(r => r.registration_id === regId);
        if (reg) {
            setSelectedRegistration(reg);
            setDropModalOpen(true);
        }
    };

    const handleConfirmSwap = async (targetStudentId, targetSectionId) => {
        // Pass: requesterSectionId, targetStudentId, targetSectionId
        await requestSwap(selectedRegistration.section_id, targetStudentId, targetSectionId);
        setSwapModalOpen(false);
    };

    const handleConfirmDrop = async (regId, reason) => {
        await dropCourse(regId, reason);
        setDropModalOpen(false);
    };

    // Toggle section selection for builder
    const toggleBuilderSection = (event) => {
        const eventId = event.id || `${event.subjectCode}-${event.dayName}-${event.startIndex}`;
        const exists = selectedBuilderSections.some(s =>
            (s.id || `${s.subjectCode}-${s.dayName}-${s.startIndex}`) === eventId
        );

        if (exists) {
            setSelectedBuilderSections(prev => prev.filter(s =>
                (s.id || `${s.subjectCode}-${s.dayName}-${s.startIndex}`) !== eventId
            ));
        } else {
            setSelectedBuilderSections(prev => [...prev, event]);
        }
    };

    // Bulk register selected courses
    const handleBulkRegister = async () => {
        if (selectedBuilderSections.length === 0) return;

        setIsRegistering(true);
        try {
            const response = await api.post('/student/bulk-register', {
                courses: selectedBuilderSections.map(s => ({
                    lessonId: s.lessonId || s.id,
                    subjectCode: s.subjectCode || s.subject_code,
                    subjectName: s.subjectName || s.subject_name || s.subjectCode,
                    day: s.dayName || s.day,
                    startTime: s.startTime || `${8 + s.startIndex}:00`,
                    endTime: s.endTime || `${8 + s.startIndex + (s.duration || 1)}:00`,
                    room: s.room || 'TBA',
                    lecturerName: s.teacherName || s.lecturer_name || '',
                    className: s.className || ''
                }))
            });

            if (response.data.success) {
                showGlassToast.success(`Registered ${selectedBuilderSections.length} courses!`);
                setSelectedBuilderSections([]);
                refreshData();
            } else {
                showGlassToast.error(response.data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Bulk register error:', error);
            showGlassToast.error(error.response?.data?.message || 'Failed to register courses');
        } finally {
            setIsRegistering(false);
        }
    };


    const getSwapSections = () => {
        if (!selectedRegistration) return [];
        return availableSections.filter(s =>
            s.code === selectedRegistration.subject_code &&
            s.section_id !== selectedRegistration.section_id
        );
    };

    // Get classes list from database aSC data
    const classList = useMemo(() => {
        if (!ascData?.classes) return [];
        return ascData.classes.sort((a, b) => (a.name || a.short || '').localeCompare(b.name || b.short || ''));
    }, [ascData]);

    // BUILD TIMETABLE GRID FOR A CLASS - COPIED 1:1 FROM EdupageDataView.jsx
    const classTimetable = useMemo(() => {
        if (!ascData || !selectedClass) return null;

        const periods = ascData.periods || [];
        const lessons = ascData.lessons || [];
        const cards = ascData.cards || [];
        const subjects = ascData.subjects || [];
        const classes = ascData.classes || [];
        const teachers = ascData.teachers || [];
        const classrooms = ascData.classrooms || [];

        // Create days array (Mon-Sun)
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const days = dayNames.map((name, idx) => ({
            id: String(idx),
            name,
            short: name.substring(0, 3)
        }));

        // Find lessons that include this class
        const classLessons = lessons.filter(lesson =>
            lesson.classids?.includes(selectedClass.id)
        );
        const classLessonIds = new Set(classLessons.map(l => l.id));

        // Find cards for these lessons
        const classCards = cards.filter(card =>
            classLessonIds.has(card.lessonid)
        );

        // Sort periods by starttime for display
        const sortedPeriods = [...periods].sort((a, b) => {
            if (a.starttime && b.starttime) {
                return a.starttime.localeCompare(b.starttime);
            }
            return String(a.id).localeCompare(String(b.id));
        });

        const periodIndexById = {};
        sortedPeriods.forEach((p, index) => {
            periodIndexById[p.id] = index;
            periodIndexById[String(p.id)] = index;
        });

        // TOTAL COLUMNS for grid calculation
        const totalPeriods = sortedPeriods.length;

        // Group cards into Events (merged by lesson & day)
        const processedEventsByDay = {};

        days.forEach(day => {
            processedEventsByDay[day.id] = [];
        });

        // 1. Group cards by "lesson-day" grouping key
        const groupedCards = {}; // "lessonId-dayId" -> [card1, card2]

        classCards.forEach(card => {
            const dayKey = String(card.dayIndex);
            if (dayKey === '-1') return;
            const key = `${card.lessonid}-${dayKey}`;

            if (!groupedCards[key]) groupedCards[key] = [];
            groupedCards[key].push(card);
        });

        // 2. Transform groups into Unified Event Objects
        Object.entries(groupedCards).forEach(([key, groupCards]) => {
            const firstCard = groupCards[0];
            const lesson = lessons.find(l => l.id === firstCard.lessonid);
            if (!lesson) return;

            // Sort cards by period to find start
            groupCards.sort((a, b) => (periodIndexById[a.periodid] || 0) - (periodIndexById[b.periodid] || 0));

            // Start index
            const startIndex = periodIndexById[groupCards[0].periodid];
            if (startIndex === undefined) return;

            // Duration: Use lesson duration as truth, or fallback to card count
            let duration = lesson.durationperiods || groupCards.length;

            // Construct Event Data
            const subject = subjects.find(s => s.id === lesson.subjectid);
            const lessonTeachers = lesson.teacherids?.map(tid => teachers.find(t => t.id === tid)).filter(Boolean) || [];
            const cardClassrooms = groupCards.flatMap(c => c.classroomids || [])
                .filter(rid => rid && rid.trim() !== '')
                .map(rid => classrooms.find(r => r.id === rid))
                .filter(Boolean);

            // Dedup classrooms
            const uniqueClassrooms = [...new Map(cardClassrooms.map(item => [item.id, item])).values()];

            const eventObj = {
                id: key,
                dayId: String(firstCard.dayIndex),
                startIndex: startIndex,
                endIndex: startIndex + duration,
                duration: duration,
                subject,
                teachers: lessonTeachers,
                classrooms: uniqueClassrooms,
                // Layout properties (calculated next)
                trackIndex: 0,
                totalTracks: 1
            };

            if (processedEventsByDay[eventObj.dayId]) {
                processedEventsByDay[eventObj.dayId].push(eventObj);
            }
        });

        // 3. Calculate Tracks (Vertical Stacking) for collisions
        days.forEach(day => {
            const events = processedEventsByDay[day.id];
            if (!events || events.length === 0) {
                day.neededTracks = 1;
                return;
            }

            // Sort by start time, then duration (longest first strategy often packs better)
            events.sort((a, b) => {
                if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
                return b.duration - a.duration;
            });

            const tracks = []; // contains 'endIndex' of the last event in that track

            events.forEach(event => {
                let placed = false;
                for (let i = 0; i < tracks.length; i++) {
                    // Check if this track is free at event.startIndex
                    if (tracks[i] <= event.startIndex) {
                        event.trackIndex = i;
                        tracks[i] = event.endIndex;
                        placed = true;
                        break;
                    }
                }

                if (!placed) {
                    // Create new track
                    event.trackIndex = tracks.length;
                    tracks.push(event.endIndex);
                }
            });

            day.neededTracks = Math.max(1, tracks.length);
        });

        return {
            days,
            periods: sortedPeriods,
            eventsByDay: processedEventsByDay,
            totalPeriods,
            classCards // Required for "No classes found" check
        };
    }, [ascData, selectedClass]);

    // Get lecturers list from database
    const lecturerList = useMemo(() => {
        if (!ascData?.teachers) return [];
        return ascData.teachers
            .filter(t => t.name || t.short)
            .sort((a, b) => (a.name || a.short || '').localeCompare(b.name || b.short || ''));
    }, [ascData]);

    const filteredLecturers = useMemo(() => {
        if (!lecturerSearch) return lecturerList;
        const search = lecturerSearch.toLowerCase();
        return lecturerList.filter(l =>
            (l.name || '').toLowerCase().includes(search) ||
            (l.short || '').toLowerCase().includes(search)
        );
    }, [lecturerList, lecturerSearch]);

    // BUILD TIMETABLE GRID FOR A LECTURER - SAME LOGIC AS CLASS
    const lecturerTimetable = useMemo(() => {
        if (!ascData || !selectedLecturer) return null;

        const periods = ascData.periods || [];
        const lessons = ascData.lessons || [];
        const cards = ascData.cards || [];
        const subjects = ascData.subjects || [];
        const classes = ascData.classes || [];
        const teachers = ascData.teachers || [];
        const classrooms = ascData.classrooms || [];

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const days = dayNames.map((name, idx) => ({
            id: String(idx),
            name,
            short: name.substring(0, 3)
        }));

        // Find lessons for this lecturer
        const lecturerLessons = lessons.filter(lesson =>
            lesson.teacherids?.includes(selectedLecturer.id)
        );
        const lecturerLessonIds = new Set(lecturerLessons.map(l => l.id));

        const lecturerCards = cards.filter(card =>
            lecturerLessonIds.has(card.lessonid)
        );

        const sortedPeriods = [...periods].sort((a, b) => {
            if (a.starttime && b.starttime) {
                return a.starttime.localeCompare(b.starttime);
            }
            return String(a.id).localeCompare(String(b.id));
        });

        const periodIndexById = {};
        sortedPeriods.forEach((p, index) => {
            periodIndexById[p.id] = index;
            periodIndexById[String(p.id)] = index;
        });

        const totalPeriods = sortedPeriods.length;
        const processedEventsByDay = {};

        days.forEach(day => {
            processedEventsByDay[day.id] = [];
        });

        const groupedCards = {};
        lecturerCards.forEach(card => {
            const dayKey = String(card.dayIndex);
            if (dayKey === '-1') return;
            const key = `${card.lessonid}-${dayKey}`;
            if (!groupedCards[key]) groupedCards[key] = [];
            groupedCards[key].push(card);
        });

        Object.entries(groupedCards).forEach(([key, groupCards]) => {
            const firstCard = groupCards[0];
            const lesson = lessons.find(l => l.id === firstCard.lessonid);
            if (!lesson) return;

            groupCards.sort((a, b) => (periodIndexById[a.periodid] || 0) - (periodIndexById[b.periodid] || 0));

            const startIndex = periodIndexById[groupCards[0].periodid];
            if (startIndex === undefined) return;

            let duration = lesson.durationperiods || groupCards.length;

            const subject = subjects.find(s => s.id === lesson.subjectid);
            const lessonClasses = lesson.classids?.map(cid => classes.find(c => c.id === cid)).filter(Boolean) || [];
            const cardClassrooms = groupCards.flatMap(c => c.classroomids || [])
                .filter(rid => rid && rid.trim() !== '')
                .map(rid => classrooms.find(r => r.id === rid))
                .filter(Boolean);
            const uniqueClassrooms = [...new Map(cardClassrooms.map(item => [item.id, item])).values()];

            const eventObj = {
                id: key,
                dayId: String(firstCard.dayIndex),
                startIndex: startIndex,
                endIndex: startIndex + duration,
                duration: duration,
                subject,
                classes: lessonClasses,
                classrooms: uniqueClassrooms,
                trackIndex: 0,
                totalTracks: 1
            };

            if (processedEventsByDay[eventObj.dayId]) {
                processedEventsByDay[eventObj.dayId].push(eventObj);
            }
        });

        days.forEach(day => {
            const events = processedEventsByDay[day.id];
            if (!events || events.length === 0) {
                day.neededTracks = 1;
                return;
            }

            events.sort((a, b) => {
                if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
                return b.duration - a.duration;
            });

            const tracks = [];
            events.forEach(event => {
                let placed = false;
                for (let i = 0; i < tracks.length; i++) {
                    if (tracks[i] <= event.startIndex) {
                        event.trackIndex = i;
                        tracks[i] = event.endIndex;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    event.trackIndex = tracks.length;
                    tracks.push(event.endIndex);
                }
            });

            day.neededTracks = Math.max(1, tracks.length);
        });

        return {
            days,
            periods: sortedPeriods,
            eventsByDay: processedEventsByDay,
            totalPeriods,
            lecturerCards
        };
    }, [ascData, selectedLecturer]);



    const displayName = user?.displayName || user?.student_name || user?.studentName || user?.lecturerName || user?.name || user?.email?.split('@')[0] || 'Student';

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
            role="student"
            title="Student Dashboard"
            activeTab={activeTab}
            onTabChange={setActiveTab}
            headerContent={headerContent}
        >
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                {/* Toast notifications handled globally in App.jsx */}

                <motion.div variants={itemVariants}>
                    <StatsOverview
                        registrations={registrations}
                        swapRequests={swapRequests}
                        manualRequests={manualRequests}
                    />
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    className="bg-white/80 dark:bg-[#0b0d14]/80 backdrop-blur-3xl border border-gray-200/50 dark:border-white/5 p-8 min-h-[500px] rounded-[32px] relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
                >
                    {/* Ambient Background Orbs inside the main card */}
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none"></div>

                    <div className="absolute top-0 right-0 p-8 opacity-30 pointer-events-none mix-blend-screen">
                        <Sparkles className="w-64 h-64 text-blue-500 blur-3xl animate-pulse" />
                    </div>

                    {activeTab === 'timetable' && (
                        <TimetableSection
                            registrations={registrations}
                            onUnregister={handleDropClick}
                            onSwap={handleSwapClick}
                        />
                    )}

                    {activeTab === 'browse' && (
                        <RegistrationSection
                            availableSections={availableSections}
                            registrations={registrations}
                            subjectFilter={subjectFilter}
                            onRegister={registerCourse}
                            onRequestJoin={requestManualJoin}
                            importSubjects={importSubjects}
                            clearFilter={clearFilter}
                            importing={importing}
                            semesterFilter={semesterFilter}
                            setSemesterFilter={setSemesterFilter}
                            currentSemester={user?.semester || 3}
                        />
                    )}

                    {activeTab === 'requests' && (
                        <RequestSection
                            swapRequests={swapRequests}
                            manualRequests={manualRequests}
                            dropRequests={dropRequests}
                            currentUserId={user?.id}
                            onSwapResponse={respondToSwap}
                            onRefresh={refreshData}
                        />
                    )}

                    {activeTab === 'semester-view' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-6 h-6 text-blue-500" />
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Semester Timetable</h3>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        ({semesterSections.length} sections)
                                    </span>
                                </div>
                                <button
                                    onClick={loadSemesterTimetable}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`w-5 h-5 text-gray-500 ${semesterLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {semesterLoading ? (
                                <LoadingSpinner />
                            ) : semesterSections.length === 0 ? (
                                <EmptyState icon={Calendar} message="No semester schedule data available" />
                            ) : (
                                <SimpleTimetableGrid sections={semesterSections} />
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'programme-schedules' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <GraduationCap className="w-6 h-6 text-red-500" />
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Programme Schedules</h3>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full dark:bg-green-900/30 dark:text-green-400">From Database</span>
                                    {selectedBuilderSections.length > 0 && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                                            {selectedBuilderSections.length} selected
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedBuilderSections.length > 0 && (
                                        <>
                                            <button
                                                onClick={() => setSelectedBuilderSections([])}
                                                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Clear
                                            </button>
                                            <button
                                                onClick={handleBulkRegister}
                                                disabled={isRegistering}
                                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium flex items-center gap-2 hover:shadow-lg transition disabled:opacity-50"
                                            >
                                                {isRegistering ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        Registering...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        Register Now ({selectedBuilderSections.length})
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Click on courses in the schedule below to add them to your timetable, then click "Register Now" to confirm.
                            </p>

                            {ascLoading ? (
                                <LoadingSpinner />
                            ) : !ascData ? (
                                <EmptyState icon={GraduationCap} message="No timetable data in database. HOP needs to fetch from aSC first." />
                            ) : (
                                <>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Class</label>
                                        <select
                                            value={selectedClass?.id || ''}
                                            onChange={(e) => {
                                                const cls = classList.find(c => c.id === e.target.value);
                                                setSelectedClass(cls || null);
                                            }}
                                            className="w-full max-w-md glass-input text-[var(--text-primary)]"
                                        >
                                            <option value="">-- Select a Class --</option>
                                            {classList.map(c => (
                                                <option key={c.id} value={c.id}>{c.name || c.short}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {classTimetable && classTimetable.periods?.length > 0 ? (
                                        <TimetableGridFromHOP
                                            timetable={classTimetable}
                                            type="class"
                                            onEventClick={(event) => toggleBuilderSection(event)}
                                            selectedEvents={selectedBuilderSections}
                                        />
                                    ) : selectedClass ? (
                                        <EmptyState icon={Calendar} message="No schedule found for this class" />
                                    ) : (
                                        <EmptyState icon={GraduationCap} message="Select a class to view their schedule" dashed />
                                    )}

                                    {/* Selected Courses Summary */}
                                    {selectedBuilderSections.length > 0 && (
                                        <div className="mt-6 p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
                                            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Your Selected Courses
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedBuilderSections.map((section, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-blue-300 dark:border-blue-700"
                                                    >
                                                        <span className="font-medium text-sm text-gray-800 dark:text-white">
                                                            {section.subjectCode || section.subject_code}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {section.dayName || section.day}
                                                        </span>
                                                        <button
                                                            onClick={() => toggleBuilderSection(section)}
                                                            className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}


                    {activeTab === 'lecturer-schedules' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex items-center gap-3 mb-6">
                                <User className="w-6 h-6 text-teal-500" />
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Lecturer Schedules</h3>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full dark:bg-green-900/30 dark:text-green-400">From Database</span>
                            </div>

                            {ascLoading ? (
                                <LoadingSpinner />
                            ) : !ascData ? (
                                <EmptyState icon={User} message="No timetable data in database. HOP needs to fetch from aSC first." />
                            ) : (
                                <>
                                    <div className="mb-6">
                                        <div className="relative max-w-md">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search lecturers..."
                                                value={lecturerSearch}
                                                onChange={(e) => setLecturerSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 glass-input text-[var(--text-primary)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                        <div className="lg:col-span-1 max-h-[500px] overflow-y-auto border border-[var(--glass-border)] rounded-2xl p-2 space-y-2 bg-[var(--bg-secondary)]/30">
                                            {filteredLecturers.length === 0 ? (
                                                <p className="text-center text-gray-500 py-8">No lecturers found</p>
                                            ) : (
                                                filteredLecturers.map(lecturer => (
                                                    <button
                                                        key={lecturer.id}
                                                        onClick={() => setSelectedLecturer(lecturer)}
                                                        className={`w-full p-3 rounded-lg text-left transition ${selectedLecturer?.id === lecturer.id
                                                            ? 'bg-[var(--neon-accent)] text-white shadow-lg shadow-blue-500/30'
                                                            : 'hover:bg-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                            }`}
                                                    >
                                                        <p className="font-medium text-gray-800 dark:text-white truncate">{lecturer.name || lecturer.short}</p>
                                                        {lecturer.short && lecturer.name && (
                                                            <p className="text-xs text-gray-500 truncate">{lecturer.short}</p>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>

                                        <div className="lg:col-span-3">
                                            {lecturerTimetable && lecturerTimetable.periods?.length > 0 ? (
                                                <TimetableGridFromHOP timetable={lecturerTimetable} type="lecturer" />
                                            ) : selectedLecturer ? (
                                                <EmptyState icon={User} message={`No schedule found for ${selectedLecturer.name || selectedLecturer.short}`} />
                                            ) : (
                                                <EmptyState icon={User} message="Select a lecturer to view their schedule" dashed />
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'builder' && (
                        <TimetableBuilder
                            ascData={ascData}
                            user={user}
                            onRefresh={refreshData}
                        />
                    )}
                </motion.div>


                <SwapRequestModal
                    isOpen={swapModalOpen}
                    onClose={() => setSwapModalOpen(false)}
                    selectedRegistration={selectedRegistration}
                    swapSections={getSwapSections()}
                    onConfirmSwap={handleConfirmSwap}
                />

                <DropModal
                    isOpen={dropModalOpen}
                    onClose={() => setDropModalOpen(false)}
                    registration={selectedRegistration}
                    onConfirm={handleConfirmDrop}
                />
            </motion.div>
        </DashboardLayout>
    );
}

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
}

function EmptyState({ icon: Icon, message, dashed = false }) {
    return (
        <div className={`text-center py-16 text-gray-500 dark:text-gray-400 ${dashed ? 'border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl' : ''}`}>
            <Icon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{message}</p>
        </div>
    );
}

// TIMETABLE GRID COPIED 1:1 FROM EdupageDataView.jsx
function TimetableGridFromHOP({ timetable, type, onEventClick, selectedEvents = [] }) {
    if (!timetable || !timetable.periods?.length) return null;

    const trackHeight = 85;

    // Check if an event is selected
    const isEventSelected = (event) => {
        return selectedEvents.some(s =>
            s.id === event.id ||
            (s.subjectCode === (event.subject?.short || event.subjectCode) &&
                s.dayName === event.dayName &&
                s.startIndex === event.startIndex)
        );
    };

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[1000px] relative">
                {/* 1. Header Row (Periods) */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2 sticky top-0 bg-white dark:bg-gray-800 z-20">
                    {/* Day Column Placeholder */}
                    <div className="w-16 md:w-24 flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"></div>

                    {/* Period Headers */}
                    <div className="flex-1 flex" style={{ display: 'grid', gridTemplateColumns: `repeat(${timetable.totalPeriods}, 1fr)` }}>
                        {timetable.periods.map(period => (
                            <div key={period.id} className="text-center p-2 border-l border-gray-100 dark:border-gray-700">
                                <div className="font-bold text-sm text-gray-700 dark:text-gray-300">
                                    {period.name || period.short || period.id}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {period.starttime}-{period.endtime}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Grid Body */}
                <div className="space-y-2 pb-4">
                    {timetable.days.map(day => {
                        const events = timetable.eventsByDay[day.id] || [];
                        const neededTracks = day.neededTracks || 1;
                        const rowHeight = Math.max(trackHeight, neededTracks * trackHeight);

                        return (
                            <div key={day.id} className="flex border-b border-gray-100 dark:border-gray-700 pb-2">
                                {/* Day Label */}
                                <div className="w-16 md:w-24 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-l-lg border-y border-l border-gray-200 dark:border-gray-700 z-10">
                                    {day.short}
                                </div>

                                {/* Day Track Content */}
                                <div
                                    className="flex-1 relative bg-gray-50/50 dark:bg-gray-800/30 rounded-r-lg border border-gray-200 dark:border-gray-700"
                                    style={{ height: `${rowHeight}px` }}
                                >
                                    {/* Background Grid Lines */}
                                    <div
                                        className="absolute inset-0 pointer-events-none grid"
                                        style={{ gridTemplateColumns: `repeat(${timetable.totalPeriods}, 1fr)` }}
                                    >
                                        {timetable.periods.map((_, i) => (
                                            <div key={i} className={`border-l ${i === 0 ? 'border-transparent' : 'border-gray-200 dark:border-gray-700/50'} h-full`}></div>
                                        ))}
                                    </div>

                                    {/* Event Cards */}
                                    {events.map(event => {
                                        const widthPercent = (event.duration / timetable.totalPeriods) * 100;
                                        const leftPercent = (event.startIndex / timetable.totalPeriods) * 100;

                                        const topPos = event.trackIndex * trackHeight;
                                        const subjectCode = event.subject?.short || '';
                                        const isMentorMentee = subjectCode.toUpperCase().includes('MENTOR');
                                        const colorClass = getSubjectColor(subjectCode);
                                        const isSelected = isEventSelected(event);

                                        // Build event data for click handler
                                        const eventData = {
                                            id: event.id,
                                            subjectCode: subjectCode,
                                            subjectName: event.subject?.name || '',
                                            dayName: day.name || day.short,
                                            startIndex: event.startIndex,
                                            duration: event.duration,
                                            room: event.classrooms?.[0]?.short || event.classrooms?.[0]?.name || '',
                                            teacherName: event.teachers?.[0]?.name || event.teachers?.[0]?.short || '',
                                            className: event.classes?.[0]?.name || event.classes?.[0]?.short || '',
                                            lessonId: event.lessonId
                                        };

                                        return (
                                            <div
                                                key={event.id}
                                                onClick={onEventClick ? () => onEventClick(eventData) : undefined}
                                                className={`absolute p-0.5 transition-all duration-200 hover:z-20 ${onEventClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                                                title={`${subjectCode} - ${event.subject?.name || ''} (Click to ${isSelected ? 'remove' : 'add'})`}
                                                style={{
                                                    left: `${leftPercent}%`,
                                                    width: `${widthPercent}%`,
                                                    top: `${topPos}px`,
                                                    height: `${trackHeight}px`
                                                }}
                                            >
                                                <div className={`
                                                    h-full w-full rounded shadow-sm border-l-[3px] p-1.5 
                                                    flex flex-col justify-between overflow-hidden
                                                    ${isSelected ? 'ring-2 ring-green-500 ring-offset-1 bg-green-100 dark:bg-green-900/50 border-green-500' : colorClass}
                                                    ${onEventClick ? 'cursor-pointer' : 'cursor-default'}

                                                `}>
                                                    <div className="font-bold text-xs leading-tight break-words whitespace-normal">
                                                        {subjectCode || 'Unknown'}
                                                    </div>

                                                    {!isMentorMentee && (
                                                        <>
                                                            {type === 'class' && event.teachers?.length > 0 && (
                                                                <div className="text-[10px] opacity-90 truncate leading-tight">
                                                                    {event.teachers.map(t => t.name || t.short).join(', ')}
                                                                </div>
                                                            )}

                                                            {type === 'lecturer' && event.classes?.length > 0 && (
                                                                <div className="text-[10px] opacity-90 truncate leading-tight">
                                                                    {event.classes.map(c => c.name || c.short).join(', ')}
                                                                </div>
                                                            )}

                                                            {event.classrooms?.length > 0 && (
                                                                <div className="flex items-center gap-1 mt-auto pt-1 opacity-80 text-xs text-nowrap overflow-hidden">
                                                                    <Building2 className="w-3 h-3 flex-shrink-0" />
                                                                    <span className="truncate">
                                                                        {event.classrooms.map(r => r.short || r.name).join(', ')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Simple timetable grid for semester view / builder - HOP STYLE with period headers
function SimpleTimetableGrid({ sections, compact = false }) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const startHour = 8;
    const endHour = 22;
    const totalPeriods = endHour - startHour;
    const sectionsArray = Array.isArray(sections) ? sections : [];
    const trackHeight = compact ? 60 : 85;

    // Generate periods with HOP-style numbering
    const periods = Array.from({ length: totalPeriods }, (_, i) => {
        const hour = startHour + i;
        const nextHour = hour + 1;
        return {
            id: i,
            name: String(i + 1),
            starttime: `${hour}:00`,
            endtime: `${nextHour}:00`
        };
    });

    // Process sections into events with track stacking (like HOP)
    const eventsByDay = {};
    days.forEach(d => { eventsByDay[d] = []; eventsByDay[d].neededTracks = 1; });

    sectionsArray.forEach(sec => {
        if (!sec.day) return;
        const dayLower = sec.day.toLowerCase();
        const dayName = days.find(d => d.toLowerCase() === dayLower || d.toLowerCase().startsWith(dayLower.substring(0, 3)));

        if (dayName && eventsByDay[dayName]) {
            const parseTime = (t) => {
                if (!t) return 8;
                const parts = t.split(':');
                return parseInt(parts[0]) || 8;
            };
            const startH = parseTime(sec.start_time);
            const endH = parseTime(sec.end_time) || startH + 1;

            eventsByDay[dayName].push({
                ...sec,
                startIndex: Math.max(0, startH - startHour),
                duration: Math.max(1, endH - startH),
                trackIndex: 0
            });
        }
    });

    // Calculate tracks for overlapping events (like HOP)
    days.forEach(day => {
        const events = eventsByDay[day];
        if (!events || events.length === 0) return;

        events.sort((a, b) => {
            if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
            return b.duration - a.duration;
        });

        const tracks = [];
        events.forEach(event => {
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
        eventsByDay[day].neededTracks = Math.max(1, tracks.length);
    });

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[1000px] relative">
                {/* 1. Header Row (Periods) - HOP STYLE */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2 sticky top-0 bg-white dark:bg-gray-800 z-20">
                    <div className="w-16 md:w-24 flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"></div>
                    <div className="flex-1 flex" style={{ display: 'grid', gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}>
                        {periods.map(period => (
                            <div key={period.id} className="text-center p-2 border-l border-gray-100 dark:border-gray-700">
                                <div className="font-bold text-sm text-gray-700 dark:text-gray-300">
                                    {period.name}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {period.starttime}-{period.endtime}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Grid Body - HOP STYLE */}
                <div className="space-y-2 pb-4">
                    {days.map(day => {
                        const events = eventsByDay[day] || [];
                        const neededTracks = events.neededTracks || 1;
                        const rowHeight = Math.max(trackHeight, neededTracks * trackHeight);

                        return (
                            <div key={day} className="flex border-b border-gray-100 dark:border-gray-700 pb-2">
                                <div className="w-16 md:w-24 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-l-lg border-y border-l border-gray-200 dark:border-gray-700 z-10">
                                    {day.substring(0, 3)}
                                </div>

                                <div
                                    className="flex-1 relative bg-gray-50/50 dark:bg-gray-800/30 rounded-r-lg border border-gray-200 dark:border-gray-700"
                                    style={{ height: `${rowHeight}px` }}
                                >
                                    {/* Background Grid Lines */}
                                    <div
                                        className="absolute inset-0 pointer-events-none grid"
                                        style={{ gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}
                                    >
                                        {periods.map((_, i) => (
                                            <div key={i} className={`border-l ${i === 0 ? 'border-transparent' : 'border-gray-200 dark:border-gray-700/50'} h-full`}></div>
                                        ))}
                                    </div>

                                    {/* Event Cards */}
                                    {events.map((sec, idx) => {
                                        const widthPercent = (sec.duration / totalPeriods) * 100;
                                        const leftPercent = (sec.startIndex / totalPeriods) * 100;
                                        const topPos = sec.trackIndex * trackHeight;
                                        const colorClass = getSubjectColor(sec.subject_code || sec.code);

                                        return (
                                            <div
                                                key={sec.id || idx}
                                                className="absolute p-0.5 transition-all duration-200 hover:z-20"
                                                title={`${sec.subject_code || sec.code} - ${sec.subject_name || sec.name}\n${sec.start_time}-${sec.end_time}\n${sec.room || ''}`}
                                                style={{
                                                    left: `${leftPercent}%`,
                                                    width: `${widthPercent}%`,
                                                    top: `${topPos}px`,
                                                    height: `${trackHeight}px`
                                                }}
                                            >
                                                <div className={`
                                                    h-full w-full rounded shadow-sm border-l-[3px] p-1.5 
                                                    flex flex-col justify-between overflow-hidden
                                                    ${colorClass} cursor-default
                                                `}>
                                                    <div className="font-bold text-xs leading-tight break-words whitespace-normal">
                                                        {sec.subject_code || sec.code || 'Unknown'}
                                                    </div>
                                                    {!compact && (
                                                        <>
                                                            {sec.lecturer_name && (
                                                                <div className="text-[10px] opacity-90 truncate leading-tight">
                                                                    {sec.lecturer_name}
                                                                </div>
                                                            )}
                                                            {sec.room && (
                                                                <div className="flex items-center gap-1 mt-auto pt-1 opacity-80 text-xs text-nowrap overflow-hidden">
                                                                    <Building2 className="w-3 h-3 flex-shrink-0" />
                                                                    <span className="truncate">{sec.room}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

