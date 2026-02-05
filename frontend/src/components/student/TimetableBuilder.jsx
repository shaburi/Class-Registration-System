import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Search, Trash2, Building2, GripVertical, X,
    Plus, Check, AlertTriangle, ChevronDown, Clock, User, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Helper to get consistent color for a subject code
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
        'bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-100',
        'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-100',
        'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-100',
        'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:border-fuchsia-700 dark:text-fuchsia-100',
        'bg-pink-100 border-pink-300 text-pink-900 dark:bg-pink-900/40 dark:border-pink-700 dark:text-pink-100',
        'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-100',
    ];
    if (!code) return colors[0];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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
    const trackHeight = 85;

    // Generate periods
    const periods = useMemo(() =>
        Array.from({ length: totalPeriods }, (_, i) => ({
            id: i,
            name: String(startHour + i),
            starttime: `${startHour + i}:00`,
            endtime: `${startHour + i + 1}:00`
        })), [totalPeriods]
    );

    // Get all classes from aSC data
    const classList = useMemo(() => {
        if (!ascData?.classes) return [];
        return ascData.classes.sort((a, b) =>
            (a.name || a.short || '').localeCompare(b.name || b.short || '')
        );
    }, [ascData]);

    // Filter classes by search
    const filteredClasses = useMemo(() => {
        if (!classSearch) return classList;
        const search = classSearch.toLowerCase();
        return classList.filter(c =>
            (c.name || '').toLowerCase().includes(search) ||
            (c.short || '').toLowerCase().includes(search)
        );
    }, [classList, classSearch]);

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
            const subject = (subjects || []).find(s => s.id === lesson.subjectid);
            const teacher = (teachers || []).find(t => lesson.teacherids?.includes(t.id));
            const classroom = (classrooms || []).find(r => groupCards[0].classroomids?.includes(r.id));

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
                className={`overflow-x-auto ${hasDropZone ? 'min-h-[300px]' : ''}`}
                onDragOver={hasDropZone ? handleDragOver : undefined}
                onDrop={hasDropZone ? handleDrop : undefined}
            >
                <div className="min-w-[900px] relative">
                    {/* Header */}
                    <div className="flex border-b border-[var(--glass-border)] mb-2 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-xl z-20">
                        <div className="w-16 flex-shrink-0 bg-[rgba(255,255,255,0.05)] border-r border-[var(--glass-border)]"></div>
                        <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}>
                            {periods.map(period => (
                                <div key={period.id} className="text-center p-1 border-l border-[var(--glass-border)]">
                                    <div className="font-bold text-xs text-[var(--text-primary)]">{period.name}</div>
                                    <div className="text-[9px] text-gray-500">{period.starttime}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Days */}
                    <div className="space-y-1">
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
                                <div key={day} className="flex border-b border-[var(--glass-border)]">
                                    <div className="w-16 flex-shrink-0 flex items-center justify-center font-bold text-xs text-[var(--text-secondary)] bg-[rgba(255,255,255,0.05)] rounded-l border-y border-l border-[var(--glass-border)]">
                                        {day.substring(0, 3)}
                                    </div>
                                    <div
                                        className={`flex-1 relative rounded-r border border-[var(--glass-border)] ${hasDropZone && draggedEvent ? 'bg-indigo-500/10 border-dashed border-indigo-500' : 'bg-[rgba(255,255,255,0.02)]'
                                            }`}
                                        style={{ height: `${rowHeight}px` }}
                                    >
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 pointer-events-none grid" style={{ gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}>
                                            {periods.map((_, i) => (
                                                <div key={i} className={`border-l ${i === 0 ? 'border-transparent' : 'border-[var(--glass-border)]'} h-full`}></div>
                                            ))}
                                        </div>

                                        {/* Events */}
                                        {events.map(event => {
                                            const widthPercent = (event.duration / totalPeriods) * 100;
                                            const leftPercent = (event.startIndex / totalPeriods) * 100;
                                            const topPos = event.trackIndex * trackHeight;
                                            const colorClass = event.hasConflict
                                                ? 'bg-red-200 border-red-500 text-red-900 dark:bg-red-900/60 dark:border-red-600 dark:text-red-100'
                                                : getSubjectColor(event.subjectCode);

                                            return (
                                                <div
                                                    key={event.id}
                                                    draggable={isSource}
                                                    onDragStart={isSource ? (e) => handleDragStart(e, event) : undefined}
                                                    onClick={isSource ? () => addCourse(event) : undefined}
                                                    className={`absolute p-0.5 transition-all duration-200 hover:z-20 ${isSource ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : ''
                                                        }`}
                                                    style={{
                                                        left: `${leftPercent}%`,
                                                        width: `${widthPercent}%`,
                                                        top: `${topPos}px`,
                                                        height: `${trackHeight}px`
                                                    }}
                                                >
                                                    <div className={`h-full w-full rounded shadow-sm border-l-[3px] p-1.5 flex flex-col overflow-hidden ${colorClass}`}>
                                                        <div className="flex items-start justify-between">
                                                            <div className="font-bold text-[11px] leading-tight break-words whitespace-normal flex-1">
                                                                {event.subjectCode}
                                                            </div>
                                                            {isSource && (
                                                                <Plus className="w-3 h-3 flex-shrink-0 opacity-50" />
                                                            )}
                                                            {!isSource && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); removePlannedCourse(event.id, event.subjectCode); }}
                                                                    className="p-1 hover:bg-red-500 hover:text-white rounded transition absolute top-1 right-1 z-10"
                                                                    title={`Remove ${event.subjectCode}`}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {event.hasConflict && (
                                                            <div className="text-[10px] flex items-center gap-0.5 text-red-700 dark:text-red-300">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                Conflict!
                                                            </div>
                                                        )}
                                                        <div className="mt-auto text-[10px] opacity-80 truncate">{event.room}</div>
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Timetable Builder</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({plannedCourses.length} selected)
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {plannedCourses.length > 0 && (
                        <button
                            onClick={() => setPlannedCourses([])}
                            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear
                        </button>
                    )}
                    <button
                        onClick={handleRegisterAll}
                        disabled={plannedCourses.length === 0 || isRegistering || personalTimetable.conflicts.length > 0}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                    >
                        {isRegistering ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Registering...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Register Now
                            </>
                        )}
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
            <div className="glass-card rounded-3xl border border-[var(--glass-border)] p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        Programme Schedule
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                            Drag to add
                        </span>
                    </h4>

                    {/* Class Search */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search class..."
                                value={classSearch}
                                onChange={(e) => setClassSearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-sm glass-input text-[var(--text-primary)] w-40"
                            />
                        </div>
                        <select
                            value={selectedSourceClass?.id || ''}
                            onChange={(e) => {
                                const cls = classList.find(c => c.id === e.target.value);
                                setSelectedSourceClass(cls || null);
                            }}
                            className="px-3 py-1.5 text-sm glass-input text-[var(--text-primary)] max-w-[200px]"
                        >
                            <option value="">Select class...</option>
                            {filteredClasses.map(c => (
                                <option key={c.id} value={c.id}>{c.name || c.short}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedSourceClass && sourceTimetable ? (
                    renderGrid(sourceTimetable.eventsByDay, true, false, sourceTimetable.days)
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>Select a class above to view its schedule</p>
                    </div>
                )}
            </div>

            {/* BOTTOM: Personal Timetable (Drop Zone) */}
            <div className="glass-card rounded-3xl border-2 border-dashed border-[var(--glass-border)] p-6 bg-[var(--glass-bg)]/50">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    Your Timetable
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                        Drop zone
                    </span>
                </h4>

                {plannedCourses.length === 0 ? (
                    <div
                        className={`text-center py-12 border-2 border-dashed rounded-xl transition-colors ${draggedEvent
                            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                            }`}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400">
                            {draggedEvent ? 'Drop here to add!' : 'Drag courses here to build your timetable'}
                        </p>
                    </div>
                ) : (
                    renderGrid(personalTimetable.eventsByDay, false, true)
                )}
            </div>
        </motion.div>
    );
}
