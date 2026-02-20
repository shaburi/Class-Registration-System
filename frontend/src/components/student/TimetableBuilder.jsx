import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Search, Trash2, Building2, GripVertical, X,
    Plus, Check, AlertTriangle, ChevronDown, Clock, User, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Helper to get consistent gradient color blocks for course cards
const getSubjectColor = (code) => {
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

export default function TimetableBuilder({ ascData, user, onRefresh }) {
    // State
    const [plannedCourses, setPlannedCourses] = useState([]);
    const [selectedSourceClass, setSelectedSourceClass] = useState(null);
    const [classSearch, setClassSearch] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [draggedEvent, setDraggedEvent] = useState(null);

    // Constants
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const startHour = 8;
    const endHour = 22;
    const totalPeriods = endHour - startHour;
    const trackHeight = 75; // Reduced height to fit comfortably

    // Generate periods
    const periods = useMemo(() =>
        Array.from({ length: totalPeriods }, (_, i) => ({
            id: i,
            name: String(i + 1),
            starttime: `${startHour + i}:00`,
            endtime: `${startHour + i + 1}:00`
        })), [totalPeriods, startHour]
    );

    // Allowed programmes to filter by
    const ALLOWED_PROGRAMMES = ['CT206', 'CT204', 'CC101'];

    // Get all classes from aSC data, filtered to only show allowed programmes
    const classList = useMemo(() => {
        if (!ascData?.classes) return [];
        return ascData.classes
            .filter(c => {
                const className = (c.name || c.short || '').toUpperCase();
                return ALLOWED_PROGRAMMES.some(prog => className.includes(prog));
            })
            .sort((a, b) =>
                (a.name || a.short || '').localeCompare(b.name || b.short || '')
            );
    }, [ascData]);

    // Build a map of class ID to subjects taught in that class
    const classSubjectMap = useMemo(() => {
        if (!ascData?.lessons || !ascData?.subjects) return {};

        // OPTIMIZATION: Build a fast O(1) lookup dictionary for subjects first
        const subjectMap = new Map();
        (ascData.subjects || []).forEach(s => subjectMap.set(s.id, s));

        const map = {};
        (ascData.lessons || []).forEach(lesson => {
            // O(1) lookup instead of O(N) .find()
            const subject = subjectMap.get(lesson.subjectid);
            if (!subject) return;

            (lesson.classids || []).forEach(classId => {
                if (!map[classId]) map[classId] = new Set();
                map[classId].add(subject.short || subject.name || '');
            });
        });

        // Convert Sets to arrays
        Object.keys(map).forEach(k => {
            map[k] = Array.from(map[k]).sort();
        });

        return map;
    }, [ascData]);

    // Filter classes by search - searches both class names AND subject codes
    const filteredClasses = useMemo(() => {
        if (!classSearch) return classList;
        const search = classSearch.toLowerCase();

        return classList.filter(c => {
            // Search by class name
            const classNameMatch =
                (c.name || '').toLowerCase().includes(search) ||
                (c.short || '').toLowerCase().includes(search);

            // Search by subjects in this class
            const subjects = classSubjectMap[c.id] || [];
            const subjectMatch = subjects.some(subj =>
                subj.toLowerCase().includes(search)
            );

            return classNameMatch || subjectMatch;
        });
    }, [classList, classSearch, classSubjectMap]);

    // Auto-select student's class on mount
    useMemo(() => {
        if (!selectedSourceClass && classList.length > 0 && user?.programme) {
            const userClass = classList.find(c =>
                (c.name || c.short || '').toUpperCase().includes(user.programme.toUpperCase())
            );
            if (userClass) setSelectedSourceClass(userClass);
        }
    }, [classList, user, selectedSourceClass]);

    // Load existing registrations into plannedCourses on mount
    useEffect(() => {
        const loadRegistrations = async () => {
            try {
                const res = await api.get('/student/registrations');
                const registrations = res.data?.data || res.data || [];

                if (registrations.length === 0) return;

                // Transform registrations into plannedCourses format
                const courses = [];
                registrations.forEach(reg => {
                    // Get all schedules for this registration
                    const schedules = reg.schedules && reg.schedules.length > 0
                        ? reg.schedules
                        : [{ day: reg.day, start_time: reg.start_time, end_time: reg.end_time, room: reg.room }];

                    // Create a planned course for each schedule (handles multi-day courses)
                    schedules.forEach((schedule, idx) => {
                        if (!schedule.day) return;

                        const startH = parseInt(schedule.start_time?.split(':')[0]) || 8;
                        const endH = parseInt(schedule.end_time?.split(':')[0]) || startH + 1;

                        courses.push({
                            id: `reg-${reg.registration_id}-${idx}`,
                            registrationId: reg.registration_id,
                            sectionId: reg.section_id,
                            dayName: schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1).toLowerCase(),
                            startIndex: startH - 8, // 8 is our startHour
                            duration: Math.max(1, endH - startH),
                            subjectCode: `${reg.subject_code}_${reg.section_number}`,
                            subjectName: reg.subject_name,
                            room: schedule.room || '',
                            teacherName: reg.lecturer_name || '',
                            isRegistered: true // Mark as already registered
                        });
                    });
                });

                setPlannedCourses(courses);
            } catch (error) {
                console.error('Failed to load registrations:', error);
            }
        };

        loadRegistrations();
    }, []);

    // Build source timetable for selected class
    const sourceTimetable = useMemo(() => {
        if (!ascData || !selectedSourceClass) return null;

        const { periods: ascPeriods, lessons, cards, subjects, teachers, classrooms } = ascData;

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const daysList = dayNames.map((name, idx) => ({
            id: String(idx),
            name,
            short: name.substring(0, 3)
        }));

        // Sort periods
        const sortedPeriods = [...(ascPeriods || [])].sort((a, b) =>
            (a.starttime || '').localeCompare(b.starttime || '')
        );
        const periodIndexById = {};
        sortedPeriods.forEach((p, idx) => {
            periodIndexById[p.id] = idx;
            periodIndexById[String(p.id)] = idx;
        });

        // Find lessons for this class
        const classLessons = (lessons || []).filter(l =>
            l.classids?.includes(selectedSourceClass.id)
        );
        const classLessonIds = new Set(classLessons.map(l => l.id));
        const classCards = (cards || []).filter(c => classLessonIds.has(c.lessonid));

        // OPTIMIZATION: Build O(1) fast lookup dictionaries
        const subjectMap = new Map();
        (subjects || []).forEach(s => subjectMap.set(s.id, s));

        const teacherMap = new Map();
        (teachers || []).forEach(t => teacherMap.set(t.id, t));

        const classroomMap = new Map();
        (classrooms || []).forEach(c => classroomMap.set(c.id, c));

        // Group cards by lesson-day
        const groupedCards = {};
        classCards.forEach(card => {
            const dayKey = String(card.dayIndex);
            if (dayKey === '-1' || card.dayIndex < 0) return;
            const key = `${card.lessonid}-${dayKey}`;
            if (!groupedCards[key]) groupedCards[key] = [];
            groupedCards[key].push(card);
        });

        // Build events
        const eventsByDay = {};
        daysList.forEach(d => { eventsByDay[d.id] = []; });

        Object.entries(groupedCards).forEach(([key, groupCards]) => {
            const firstCard = groupCards[0];
            const lesson = (lessons || []).find(l => l.id === firstCard.lessonid);
            if (!lesson) return;

            groupCards.sort((a, b) =>
                (periodIndexById[a.periodid] || 0) - (periodIndexById[b.periodid] || 0)
            );

            const startIndex = periodIndexById[groupCards[0].periodid];
            if (startIndex === undefined) return;

            const duration = lesson.durationperiods || groupCards.length || 1;

            // O(1) Lookups instead of slow O(N) array.find loops inside the main loop
            const subject = subjectMap.get(lesson.subjectid);
            const teacher = lesson.teacherids?.length > 0 ? teacherMap.get(lesson.teacherids[0]) : null;
            const classroom = groupCards[0].classroomids?.length > 0 ? classroomMap.get(groupCards[0].classroomids[0]) : null;

            // Convert period-based to hour-based for our grid
            const startPeriod = sortedPeriods[startIndex];
            const startHourVal = startPeriod ? parseInt(startPeriod.starttime?.split(':')[0]) || 8 : 8;
            const hourStartIndex = startHourVal - startHour;

            const event = {
                id: key,
                lessonId: lesson.id,
                dayId: String(firstCard.dayIndex),
                dayName: dayNames[firstCard.dayIndex],
                startIndex: hourStartIndex,
                duration: duration,
                subject,
                subjectCode: subject?.short || subject?.name || 'Unknown',
                subjectName: subject?.name || '',
                teacher,
                teacherName: teacher?.name || teacher?.short || '',
                classroom,
                room: classroom?.short || classroom?.name || '',
                classId: selectedSourceClass.id,
                className: selectedSourceClass.name || selectedSourceClass.short,
                trackIndex: 0
            };

            if (eventsByDay[event.dayId]) {
                eventsByDay[event.dayId].push(event);
            }
        });

        // Calculate tracks
        daysList.forEach(day => {
            const events = eventsByDay[day.id] || [];
            events.sort((a, b) => a.startIndex - b.startIndex || b.duration - a.duration);
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
            day.neededTracks = Math.max(1, tracks.length);
        });

        return { days: daysList, periods: sortedPeriods, eventsByDay, totalPeriods: sortedPeriods.length };
    }, [ascData, selectedSourceClass]);

    // Build personal timetable from planned courses
    const personalTimetable = useMemo(() => {
        const eventsByDay = {};
        days.forEach((d, i) => { eventsByDay[String(i)] = []; });

        plannedCourses.forEach(course => {
            const dayIndex = days.findIndex(d =>
                d.toLowerCase() === course.dayName?.toLowerCase() ||
                d.substring(0, 3).toLowerCase() === course.dayName?.substring(0, 3).toLowerCase()
            );
            if (dayIndex >= 0) {
                eventsByDay[String(dayIndex)].push({
                    ...course,
                    dayId: String(dayIndex),
                    trackIndex: 0
                });
            }
        });

        // Calculate tracks and check conflicts
        const conflicts = [];
        days.forEach((day, dayIdx) => {
            const events = eventsByDay[String(dayIdx)] || [];
            events.sort((a, b) => a.startIndex - b.startIndex);

            // Check for overlaps
            for (let i = 0; i < events.length; i++) {
                for (let j = i + 1; j < events.length; j++) {
                    const a = events[i];
                    const b = events[j];
                    if (a.startIndex < b.startIndex + b.duration &&
                        b.startIndex < a.startIndex + a.duration) {
                        conflicts.push({ a, b, day });
                        a.hasConflict = true;
                        b.hasConflict = true;
                    }
                }
            }

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
            eventsByDay[String(dayIdx)].neededTracks = Math.max(1, tracks.length);
        });

        return { eventsByDay, conflicts };
    }, [plannedCourses]);

    // Drag handlers
    const handleDragStart = (e, event) => {
        setDraggedEvent(event);
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify(event));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (!draggedEvent) return;

        // Use addCourse to add all sessions for this lesson
        addCourse(draggedEvent);
        setDraggedEvent(null);
    };

    const removePlannedCourse = (courseId, subjectCode) => {
        // Remove ALL sessions with the same subjectCode
        setPlannedCourses(prev => prev.filter(c => c.subjectCode !== subjectCode));
        toast.success(`Removed all sessions for ${subjectCode}`);
    };

    // Quick add (click to add) - adds ALL sessions for this lesson
    const addCourse = (event) => {
        // Extract base subject code (e.g., MMC3113 from MMC3113_03)
        const getBaseSubjectCode = (code) => {
            if (!code) return '';
            // Remove section suffix like _03, _05, etc.
            return code.replace(/_\d+$/, '').toUpperCase();
        };

        const baseCode = getBaseSubjectCode(event.subjectCode);

        // Check if any section of this subject is already added
        const existingSection = plannedCourses.find(c =>
            getBaseSubjectCode(c.subjectCode) === baseCode
        );

        if (existingSection) {
            toast.error(`You already have ${existingSection.subjectCode} in your timetable. Remove it first to add a different section.`);
            return;
        }

        // Find ALL events with the SAME subjectCode (all sessions for this section)
        const allSessionsForSection = [];

        if (sourceTimetable?.eventsByDay) {
            Object.values(sourceTimetable.eventsByDay).forEach(dayEvents => {
                dayEvents.forEach(e => {
                    // Match by exact subjectCode (e.g., ARC2203_04)
                    if (e.subjectCode === event.subjectCode) {
                        allSessionsForSection.push(e);
                    }
                });
            });
        }

        // If no sessions found, just add the clicked event
        const sessionsToAdd = allSessionsForSection.length > 0 ? allSessionsForSection : [event];

        // Check which are already added
        const newSessions = sessionsToAdd.filter(session =>
            !plannedCourses.some(c => c.id === session.id)
        );

        if (newSessions.length === 0) {
            toast.error('All sessions for this course are already added');
            return;
        }

        setPlannedCourses(prev => [...prev, ...newSessions.map(s => ({ ...s }))]);
        toast.success(`Added ${newSessions.length} session(s) for ${event.subjectCode}`);
    };

    // Register all planned courses
    const handleRegisterAll = async () => {
        if (plannedCourses.length === 0) {
            toast.error('No courses to register');
            return;
        }

        if (personalTimetable.conflicts.length > 0) {
            toast.error('Please resolve conflicts before registering');
            return;
        }

        setIsRegistering(true);
        try {
            // Call bulk register API
            const response = await api.post('/student/bulk-register', {
                courses: plannedCourses.map(c => ({
                    lessonId: c.lessonId,
                    subjectCode: c.subjectCode,
                    subjectName: c.subjectName,
                    day: c.dayName,
                    startTime: `${startHour + c.startIndex}:00`,
                    endTime: `${startHour + c.startIndex + c.duration}:00`,
                    room: c.room,
                    lecturerName: c.teacherName,
                    className: c.className
                }))
            });

            if (response.data.success) {
                toast.success(`Registered ${plannedCourses.length} courses successfully!`);
                setPlannedCourses([]);
                onRefresh?.();
            } else {
                toast.error(response.data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.response?.data?.message || 'Failed to register courses');
        } finally {
            setIsRegistering(false);
        }
    };

    // Render timetable grid
    const renderGrid = (eventsByDay, isSource = false, hasDropZone = false, trackInfo = null) => {
        return (
            <div
                className={`w-full overflow-hidden ${hasDropZone ? 'min-h-[300px]' : ''}`}
                onDragOver={hasDropZone ? handleDragOver : undefined}
                onDrop={hasDropZone ? handleDrop : undefined}
            >
                {/* Desktop Grid View */}
                <div className="hidden md:block w-full relative rounded-[20px] overflow-hidden border border-gray-200/50 dark:border-white/10 shadow-lg dark:shadow-2xl">
                    {/* Header */}
                    <div className="flex border-b border-gray-200/50 dark:border-white/10 sticky top-0 bg-white/95 dark:bg-[#07090e]/95 backdrop-blur-2xl z-20 shadow-sm">
                        <div className="w-12 md:w-16 flex-shrink-0 bg-gray-50/80 dark:bg-white/5 border-r border-gray-200/50 dark:border-white/10"></div>
                        <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}>
                            {periods.map(period => (
                                <div key={period.id} className="text-center p-1 md:p-2 border-l border-gray-200/50 dark:border-white/5">
                                    <div className="font-bold text-[10px] md:text-xs text-gray-900 dark:text-white uppercase tracking-wider">{period.name}</div>
                                    <div className="text-[7.5px] md:text-[9px] text-blue-600 dark:text-blue-300/80 font-bold tracking-wide">{period.starttime}-{period.endtime}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Days */}
                    <div className="bg-white/50 dark:bg-[#0b0d14]/70 backdrop-blur-md">
                        {days.map((day, dayIdx) => {
                            const dayKey = String(dayIdx);
                            const events = eventsByDay[dayKey] || [];

                            // Get neededTracks from trackInfo (for source) or calculate from events
                            let neededTracks = 1;
                            if (trackInfo && trackInfo[dayIdx]) {
                                neededTracks = trackInfo[dayIdx].neededTracks || 1;
                            } else if (events.length > 0) {
                                // Calculate from event trackIndex
                                neededTracks = Math.max(1, ...events.map(e => (e.trackIndex || 0) + 1));
                            }
                            const rowHeight = Math.max(trackHeight, neededTracks * trackHeight);

                            return (
                                <div key={day} className="flex border-b border-gray-200/50 dark:border-white/5 group">
                                    <div className="w-12 md:w-16 flex-shrink-0 flex items-center justify-center font-bold text-[10px] md:text-[11px] uppercase tracking-widest text-blue-600 dark:text-blue-300/60 bg-gray-50 dark:bg-white/5 rounded-l-sm border-r border-gray-200/50 dark:border-white/5 group-hover:bg-gray-100 dark:group-hover:bg-white/10 transition-colors">
                                        {day.substring(0, 3)}
                                    </div>
                                    <div
                                        className={`flex-1 relative transition-colors duration-300 ${hasDropZone && draggedEvent ? 'bg-blue-50 dark:bg-blue-500/10 shadow-[inset_0_0_50px_rgba(37,99,235,0.1)] dark:shadow-[inset_0_0_50px_rgba(37,99,235,0.2)]' : 'hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                        style={{ height: `${rowHeight}px` }}
                                    >
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 pointer-events-none grid" style={{ gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}>
                                            {periods.map((_, i) => (
                                                <div key={i} className={`border-l ${i === 0 ? 'border-transparent' : 'border-gray-200/50 dark:border-white/5'} h-full transition-colors group-hover:border-gray-300 dark:group-hover:border-white/10`}></div>
                                            ))}
                                        </div>

                                        {/* Events */}
                                        {events.map(event => {
                                            const widthPercent = (event.duration / totalPeriods) * 100;
                                            const leftPercent = (event.startIndex / totalPeriods) * 100;
                                            const topPos = event.trackIndex * trackHeight;
                                            const colorClass = event.hasConflict
                                                ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-400/50 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(239,68,68,0.5)] ring-2 ring-red-500/50'
                                                : getSubjectColor(event.subjectCode);

                                            return (
                                                <div
                                                    key={event.id}
                                                    draggable={isSource}
                                                    onDragStart={isSource ? (e) => handleDragStart(e, event) : undefined}
                                                    onClick={isSource ? () => addCourse(event) : undefined}
                                                    className={`absolute p-1 transition-all duration-300 hover:z-20 ${isSource ? 'cursor-grab active:cursor-grabbing hover:scale-[1.03]' : ''
                                                        }`}
                                                    style={{
                                                        left: `${leftPercent}%`,
                                                        width: `${widthPercent}%`,
                                                        top: `${topPos}px`,
                                                        height: `${trackHeight}px`
                                                    }}
                                                >
                                                    <div className={`h-full w-full rounded-[14px] border flex flex-col overflow-hidden relative group/event ${colorClass}`}>
                                                        {/* Inner glow effect */}
                                                        <div className="absolute inset-0 bg-white/20 dark:bg-white/10 opacity-0 group-hover/event:opacity-100 transition-opacity pointer-events-none rounded-[14px]"></div>
                                                        <div className="relative z-10 p-1.5 flex flex-col h-full text-white">
                                                            <div className="flex items-start justify-between">
                                                                <div className="font-extrabold text-[9px] md:text-[10px] leading-tight break-words whitespace-normal">
                                                                    {event.subjectCode}
                                                                </div>
                                                                {isSource && (
                                                                    <div className="bg-black/20 dark:bg-white/20 rounded-full p-0.5 opacity-0 group-hover/event:opacity-100 transition-opacity flex-shrink-0 backdrop-blur-sm">
                                                                        <Plus className="w-2.5 h-2.5 text-white" />
                                                                    </div>
                                                                )}
                                                                {!isSource && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); removePlannedCourse(event.id, event.subjectCode); }}
                                                                        className="p-1 hover:bg-red-500 hover:text-white rounded transition absolute top-0.5 right-0.5 z-10"
                                                                        title={`Remove ${event.subjectCode}`}
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {event.hasConflict && (
                                                                <div className="text-[8px] md:text-[9px] flex items-center gap-0.5 text-red-700 dark:text-red-300 mt-0.5 font-bold">
                                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                                    Conflict
                                                                </div>
                                                            )}
                                                            <div className="mt-auto text-[8px] md:text-[9px] opacity-80 truncate">{event.room}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Empty state for drop zone */}
                                        {hasDropZone && events.length === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs pointer-events-none">
                                                {draggedEvent ? 'Drop here!' : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Agenda View */}
                <div className="block md:hidden space-y-4 pt-4">
                    {days.map((day, dayIdx) => {
                        const dayKey = String(dayIdx);
                        const events = eventsByDay[dayKey] || [];
                        if (events.length === 0 && !hasDropZone) return null;

                        return (
                            <div key={day} className="bg-white/40 dark:bg-[#0b0d14]/60 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-blue-50 dark:bg-blue-500/10 px-4 py-2 border-b border-blue-100 dark:border-blue-500/20">
                                    <h3 className="font-bold text-sm text-blue-800 dark:text-blue-300 tracking-wide uppercase">{day}</h3>
                                </div>
                                <div className="p-2 space-y-2 relative min-h-[60px]">
                                    {events.sort((a, b) => a.startIndex - b.startIndex).map(event => {
                                        const colorClass = event.hasConflict
                                            ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                                            : 'bg-white/60 dark:bg-white/5 border-gray-200/50 dark:border-white/5';
                                        const textColorClass = event.hasConflict ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200';

                                        // Calculate start and end times based on periods array (0-indexed)
                                        const startPeriod = periods[event.startIndex];
                                        const endPeriod = periods[event.startIndex + event.duration - 1];
                                        const timeString = startPeriod && endPeriod ? `${startPeriod.starttime} - ${endPeriod.endtime}` : '';

                                        return (
                                            <div
                                                key={event.id}
                                                draggable={isSource}
                                                onDragStart={isSource ? (e) => handleDragStart(e, event) : undefined}
                                                onClick={isSource ? () => addCourse(event) : undefined}
                                                className={`relative flex flex-col p-3 rounded-xl border shadow-sm ${colorClass} ${isSource ? 'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1 gap-2">
                                                    <span className={`font-extrabold text-sm ${textColorClass} break-words`}>{event.subjectCode}</span>
                                                    {timeString && (
                                                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded flex-shrink-0">
                                                            {timeString}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-gray-600 dark:text-gray-300 font-medium mb-3">{event.subjectName || event.subjectCode}</div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200/50 dark:border-white/10">
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate pr-2">
                                                        {event.teacherName || 'Unknown Lecturer'}
                                                    </span>
                                                    <span className="text-[9px] font-extrabold text-gray-700 dark:text-gray-200 bg-gray-200/70 dark:bg-white/10 px-2 py-0.5 rounded tracking-wide shadow-sm flex-shrink-0 border border-gray-300/50 dark:border-white/5">
                                                        {event.room}
                                                    </span>
                                                </div>

                                                {isSource && (
                                                    <button className="absolute -right-2 -top-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow-lg transition-colors border-2 border-white dark:border-[#0b0d14]">
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                )}

                                                {!isSource && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removePlannedCourse(event.id, event.subjectCode); }}
                                                        className="absolute -right-2 -top-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors border-2 border-white dark:border-[#0b0d14]"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}

                                                {event.hasConflict && (
                                                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-red-700 dark:text-red-300 font-extrabold bg-red-100 dark:bg-red-500/20 px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30">
                                                        <AlertTriangle className="w-3.5 h-3.5" /> Conflict Detected
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {hasDropZone && events.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-400 dark:text-gray-500 italic pointer-events-none">
                                            {draggedEvent ? 'Drop classes here' : 'No classes planned'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!ascData) {
        return (
            <div className="text-center py-16 text-gray-500">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Loading timetable data from database...</p>
                <p className="text-sm mt-2">If no data appears, please check Database → aSC Timetables.</p>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl shadow-inner relative group cursor-default">
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                        <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 relative z-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold font-heading tracking-tight text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-md">Timetable Builder</h3>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-300/80 uppercase tracking-widest text-[10px] mt-0.5">
                            {plannedCourses.length} session{plannedCourses.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {plannedCourses.length > 0 && (
                        <button
                            onClick={() => setPlannedCourses([])}
                            className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/20 rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear
                        </button>
                    )}
                    <button
                        onClick={handleRegisterAll}
                        disabled={plannedCourses.length === 0 || isRegistering || personalTimetable.conflicts.length > 0}
                        className="flex-1 sm:flex-none py-3 px-6 rounded-xl font-bold uppercase tracking-widest text-xs relative overflow-hidden group/btn border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                            border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    >
                        {!isRegistering && !plannedCourses.length === 0 && !personalTimetable.conflicts.length > 0 && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>}
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isRegistering ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-emerald-300/50 border-t-emerald-300 rounded-full animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Register Now
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400">
                Drag courses from the programme schedule below to build your personal timetable, or click to add.
            </p>

            {/* Conflict Warning */}
            {personalTimetable.conflicts.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 dark:text-red-300 text-sm font-medium">
                        You have {personalTimetable.conflicts.length} time conflict(s). Please remove overlapping courses before registering.
                    </span>
                </div>
            )}

            {/* TOP: Programme Schedule Source */}
            <div className="bg-white/80 dark:bg-[#0b0d14]/80 backdrop-blur-2xl rounded-[32px] border border-gray-200/50 dark:border-white/5 p-4 md:p-8 relative overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)]">
                {/* Immersive glow */}
                <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-red-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-6 gap-4 relative z-10">
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-xl font-heading tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-inner">
                                <GripVertical className="w-5 h-5" />
                            </span>
                            Programme Schedule
                        </h4>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-blue-600/80 dark:text-blue-300/60 mt-1 pl-[52px]">
                            Drag courses to build your timetable
                        </p>
                    </div>

                    {/* Class Search */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search class or subject..."
                                value={classSearch}
                                onChange={(e) => setClassSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 text-sm bg-black/5 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(37,99,235,0.1)] dark:focus:shadow-[0_0_20px_rgba(37,99,235,0.2)] shadow-inner transition-all font-medium"
                            />
                        </div>
                        <select
                            value={selectedSourceClass?.id || ''}
                            onChange={(e) => {
                                const cls = classList.find(c => c.id === e.target.value);
                                setSelectedSourceClass(cls || null);
                            }}
                            className="w-full sm:w-auto px-4 py-3 text-sm bg-white dark:bg-[#0b0d14] border border-gray-200/50 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 shadow-inner transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Select class...</option>
                            {filteredClasses.map(c => {
                                const subjects = classSubjectMap[c.id] || [];
                                const search = classSearch.toLowerCase();
                                // Find matched subjects if searching
                                const matchedSubjects = search
                                    ? subjects.filter(s => s.toLowerCase().includes(search))
                                    : [];
                                const label = matchedSubjects.length > 0
                                    ? `${c.name || c.short} (${matchedSubjects.slice(0, 3).join(', ')}${matchedSubjects.length > 3 ? '...' : ''})`
                                    : c.name || c.short;
                                return (
                                    <option key={c.id} value={c.id}>{label}</option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                <div className="relative z-10">
                    {selectedSourceClass && sourceTimetable ? (
                        renderGrid(sourceTimetable.eventsByDay, true, false, sourceTimetable.days)
                    ) : (
                        <div className="text-center py-16 text-gray-500 border border-gray-200/50 dark:border-white/5 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-400" />
                            <p className="font-medium">Select a class above to view its schedule</p>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM: Personal Timetable (Drop Zone) */}
            <div className="bg-gray-50/50 dark:bg-[#0b0d14]/40 backdrop-blur-xl rounded-[32px] border-2 border-dashed border-gray-300 dark:border-white/10 p-8 shadow-inner relative overflow-hidden transition-colors duration-500">
                {draggedEvent && <div className="absolute inset-0 bg-blue-500/5 animate-pulse rounded-[32px] pointer-events-none"></div>}

                <div className="relative z-10">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xl font-heading tracking-tight flex items-center gap-3 mb-6">
                        <span className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-red-600 dark:text-red-400 shadow-[inset_0_0_15px_rgba(220,38,38,0.1)]">
                            <Calendar className="w-5 h-5" />
                        </span>
                        Your Timetable
                        <span className="text-[10px] uppercase tracking-widest font-bold text-red-600/80 dark:text-red-400/80 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full ml-auto">
                            Drop zone
                        </span>
                    </h4>

                    {plannedCourses.length === 0 ? (
                        <div
                            className={`text-center py-16 border-2 border-dashed rounded-[20px] transition-all duration-300 ${draggedEvent
                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 shadow-[inset_0_0_50px_rgba(37,99,235,0.1)] dark:shadow-[inset_0_0_50px_rgba(37,99,235,0.2)]'
                                : 'border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5'
                                }`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <Sparkles className={`w-14 h-14 mx-auto mb-4 transition-colors ${draggedEvent ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-gray-400 dark:text-gray-600'}`} />
                            <p className={`font-semibold text-lg ${draggedEvent ? 'text-blue-600 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                {draggedEvent ? 'Drop course here!' : 'Construct your schedule here'}
                            </p>
                        </div>
                    ) : (
                        renderGrid(personalTimetable.eventsByDay, false, true)
                    )}
                </div>
            </div>
        </motion.div>
    );
}
