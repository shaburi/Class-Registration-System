import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCw,
    Clock,
    AlertTriangle,
    CheckCircle,
    Users,
    BookOpen,
    GraduationCap,
    Building2,
    Calendar,
    Loader2,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Grid3X3,
    Download,
    Plus,
    Edit2,
    Check
} from 'lucide-react';
import api from '../services/api';

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
        'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100',
        'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-100',
        'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-100',
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

/**
 * EdupageDataView Component
 * 
 * Displays timetable data fetched from aSc Edupage API.
 * Data is stored locally in database - only fetched when HOP clicks "Fetch Timetable".
 * Note: Timetables are read-only views generated from the asc_timetable_data table.
 */
const EdupageDataView = () => {
    const [data, setData] = useState(null);
    const [syncedAt, setSyncedAt] = useState(null);
    const [isStale, setIsStale] = useState(false);
    const [daysSinceSync, setDaysSinceSync] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('timetable');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedSections, setExpandedSections] = useState({});

    // Missing subjects state
    const [missingSubjects, setMissingSubjects] = useState([]);
    const [selectedMissingSubjects, setSelectedMissingSubjects] = useState(new Set());
    const [editingSubject, setEditingSubject] = useState(null);
    const [addingSubjects, setAddingSubjects] = useState(false);

    // Target course prefixes to filter
    const targetCoursePrefixes = ['CT206', 'CT204', 'CC101'];

    // Import modal state - allows selecting which programmes to import
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedImportPrefixes, setSelectedImportPrefixes] = useState(new Set(targetCoursePrefixes));

    // State for selected course prefix and specific class
    const [selectedPrefix, setSelectedPrefix] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [relatedClasses, setRelatedClasses] = useState([]); // Classes sharing same subject from search

    // Navigate to prev/next related class
    const navigateRelatedClass = useCallback((direction) => {
        if (!selectedClass || relatedClasses.length <= 1) return;
        const currentIndex = relatedClasses.findIndex(c => c.id === selectedClass.id);
        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % relatedClasses.length;
        } else {
            nextIndex = (currentIndex - 1 + relatedClasses.length) % relatedClasses.length;
        }
        const nextClass = relatedClasses[nextIndex];
        const matchingPrefix = targetCoursePrefixes.find(prefix =>
            nextClass.short?.toUpperCase().startsWith(prefix) || nextClass.name?.toUpperCase().startsWith(prefix)
        );
        if (matchingPrefix) setSelectedPrefix(matchingPrefix);
        setSelectedClass(nextClass);
    }, [selectedClass, relatedClasses]);

    // Load stored data on component mount
    useEffect(() => {
        loadStoredData();
    }, []);

    // Get classes grouped by prefix (CT206, CT204, CC101)
    const classesGroupedByPrefix = useMemo(() => {
        if (!data?.classes) return {};

        const groups = {};
        targetCoursePrefixes.forEach(prefix => {
            groups[prefix] = data.classes.filter(c =>
                c.short?.toUpperCase().startsWith(prefix) ||
                c.name?.toUpperCase().startsWith(prefix)
            ).sort((a, b) => (a.short || a.name || '').localeCompare(b.short || b.name || ''));
        });
        return groups;
    }, [data?.classes]);

    // Build timetable grid for a specific class
    // Build timetable grid for a specific class (Absolute Layout Version)
    const classTimetable = useMemo(() => {
        if (!data || !selectedClass) return null;

        const periods = data.periods || [];
        const lessons = data.lessons || [];
        const cards = data.cards || [];
        const subjects = data.subjects || [];
        const classes = data.classes || [];
        const teachers = data.teachers || [];
        const classrooms = data.classrooms || [];

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
        // Logic: If two events overlap in time, they must be on different 'tracks' (rows).

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
    }, [data, selectedClass]);

    const loadStoredData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/hop/edupage/data');

            if (response.data.success) {
                setData(response.data.data);
                setSyncedAt(response.data.syncedAt);
                setIsStale(response.data.isStale);
                setDaysSinceSync(response.data.daysSinceSync);
            }
        } catch (err) {
            console.error('Failed to load Edupage data:', err);
            setError(err.response?.data?.message || 'Failed to load timetable data');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            setError(null);
            // Use longer timeout for external API sync (60 seconds)
            const response = await api.post('/hop/edupage/sync', {}, { timeout: 60000 });

            if (response.data.success) {
                setData(response.data.data);
                setSyncedAt(response.data.syncedAt);
                setIsStale(false);
                setDaysSinceSync(0);
            }
        } catch (err) {
            console.error('Sync failed:', err);
            setError(err.response?.data?.message || 'Failed to sync from Edupage');
        } finally {
            setSyncing(false);
        }
    };

    const handleImportSections = async () => {
        const prefixesToImport = Array.from(selectedImportPrefixes);

        if (prefixesToImport.length === 0) {
            setError('Please select at least one programme to import');
            return;
        }

        setShowImportModal(false);

        try {
            setImporting(true);
            setError(null);
            setImportResult(null);
            setMissingSubjects([]);

            let response;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                console.log(`[IMPORT] Attempt ${retryCount + 1} for prefixes:`, prefixesToImport);

                response = await api.post('/hop/edupage/import-sections', {
                    prefixes: prefixesToImport
                }, { timeout: 120000 });

                console.log(`[IMPORT] Response:`, response.data);

                // If successful, break out
                if (response.data.success) {
                    console.log('[IMPORT] Success!');
                    break;
                }

                // If there are missing subjects, auto-add them
                if (response.data.hasMissingSubjects) {
                    const missingSubjectsData = response.data.missingSubjects || [];
                    console.log(`[IMPORT] Found ${missingSubjectsData.length} missing subjects, auto-adding...`);

                    if (missingSubjectsData.length === 0) {
                        break; // No more missing subjects but still failing - something else is wrong
                    }

                    // Assign the selected programme to missing subjects
                    const subjectsToAdd = missingSubjectsData.map(s => ({
                        ...s,
                        programme: prefixesToImport[0] || s.programme || 'CT206'
                    }));

                    // Add the missing subjects
                    const addResponse = await api.post('/hop/subjects/bulk-create', {
                        subjects: subjectsToAdd
                    });

                    console.log(`[IMPORT] Added ${addResponse.data.data?.created || 0} subjects`);

                    // Wait a moment for DB to sync
                    await new Promise(resolve => setTimeout(resolve, 300));

                    retryCount++;
                } else {
                    // Some other failure, don't retry
                    break;
                }
            }

            if (response.data.success) {
                setImportResult({
                    ...response.data.summary,
                    message: response.data.summary?.message || `Imported sections successfully!`
                });
                setMissingSubjects([]);
            } else if (response.data.hasMissingSubjects) {
                // Still have missing subjects after max retries - show them for manual review
                console.log('[IMPORT] Still have missing subjects after retries:', response.data.missingSubjects);
                setMissingSubjects(response.data.missingSubjects || []);
                setSelectedMissingSubjects(new Set(response.data.missingSubjects?.map(s => s.code) || []));
                setImportResult(null);
            } else {
                setError(response.data.message || 'Import failed');
            }
        } catch (err) {
            console.error('[IMPORT] Import failed with error:', err);
            setError(err.response?.data?.message || 'Failed to import sections');
        } finally {
            setImporting(false);
        }
    };

    // Handle adding selected missing subjects
    const handleAddMissingSubjects = async () => {
        const subjectsToAdd = missingSubjects.filter(s => selectedMissingSubjects.has(s.code));

        if (subjectsToAdd.length === 0) {
            setError('Please select at least one subject to add');
            return;
        }

        try {
            setAddingSubjects(true);
            setError(null);

            const response = await api.post('/hop/subjects/bulk-create', {
                subjects: subjectsToAdd
            });

            if (response.data.success) {
                // Remove added subjects from the list
                const addedCodes = new Set(response.data.data.created_subjects?.map(s => s.code) || []);
                setMissingSubjects(prev => prev.filter(s => !addedCodes.has(s.code)));
                setSelectedMissingSubjects(prev => {
                    const newSet = new Set(prev);
                    addedCodes.forEach(code => newSet.delete(code));
                    return newSet;
                });

                // Show success message
                setImportResult({
                    message: `Added ${response.data.data.created} subjects successfully!`,
                    created: response.data.data.created,
                    skipped: response.data.data.skipped
                });
            }
        } catch (err) {
            console.error('Add subjects failed:', err);
            setError(err.response?.data?.message || 'Failed to add subjects');
        } finally {
            setAddingSubjects(false);
        }
    };

    // Toggle selection of a missing subject
    const toggleMissingSubjectSelection = (code) => {
        setSelectedMissingSubjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(code)) {
                newSet.delete(code);
            } else {
                newSet.add(code);
            }
            return newSet;
        });
    };

    // Toggle select all missing subjects
    const toggleSelectAllMissingSubjects = () => {
        if (selectedMissingSubjects.size === missingSubjects.length) {
            setSelectedMissingSubjects(new Set());
        } else {
            setSelectedMissingSubjects(new Set(missingSubjects.map(s => s.code)));
        }
    };

    // Update a missing subject's details
    const updateMissingSubject = (code, field, value) => {
        setMissingSubjects(prev => prev.map(s =>
            s.code === code ? { ...s, [field]: value } : s
        ));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString('en-MY', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const filterData = (items, fields) => {
        if (!searchTerm || !items) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item =>
            fields.some(field =>
                item[field]?.toString().toLowerCase().includes(term)
            )
        );
    };

    const isTargetCourse = (code) => {
        return targetCoursePrefixes.some(target =>
            code?.toUpperCase().includes(target)
        );
    };

    // Tab configuration - count classes matching our target prefixes
    const totalTargetClasses = targetCoursePrefixes.reduce((sum, prefix) =>
        sum + (classesGroupedByPrefix[prefix]?.length || 0), 0
    );

    const tabs = [
        { id: 'timetable', label: 'Course Timetable', icon: Grid3X3, count: totalTargetClasses },
        { id: 'subjects', label: 'Subjects', icon: BookOpen, count: data?.subjects?.length || 0 },
        { id: 'teachers', label: 'Lecturers', icon: Users, count: data?.teachers?.length || 0 },
        { id: 'classes', label: 'Classes', icon: GraduationCap, count: data?.classes?.length || 0 },
        { id: 'classrooms', label: 'Rooms', icon: Building2, count: data?.classrooms?.length || 0 },
        { id: 'lessons', label: 'Raw Lessons', icon: Calendar, count: data?.lessons?.length || 0 }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading timetable data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Sync Button */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-primary-500" />
                            aSc Timetable Data
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Timetable data from UPTM Edupage system
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Sync Status */}
                        <div className="text-right">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                    Last synced: {formatDate(syncedAt)}
                                </span>
                            </div>
                            {isStale && (
                                <div className="flex items-center gap-1 text-orange-500 text-xs mt-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Data is {daysSinceSync} days old</span>
                                </div>
                            )}
                        </div>

                        {/* Sync Button */}
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                                transition-all duration-200
                                ${syncing
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                                    : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow'
                                }
                            `}
                        >
                            {syncing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Fetch Timetable
                                </>
                            )}
                        </button>

                        {/* Import Sections Button */}
                        {data && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                disabled={importing || syncing}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                                    transition-all duration-200
                                    ${importing
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                                        : 'bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow'
                                    }
                                `}
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Import Sections
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Import Sections Modal - Programme Selector */}
                {showImportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowImportModal(false)}
                        />
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 m-4 max-w-md w-full">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Import Sections
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Select which programmes to import sections for:
                            </p>

                            <div className="space-y-3 mb-6">
                                {targetCoursePrefixes.map(prefix => {
                                    const classCount = classesGroupedByPrefix[prefix]?.length || 0;
                                    const isSelected = selectedImportPrefixes.has(prefix);

                                    return (
                                        <label
                                            key={prefix}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                                                ${isSelected
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                }
                                            `}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                    setSelectedImportPrefixes(prev => {
                                                        const newSet = new Set(prev);
                                                        if (newSet.has(prefix)) {
                                                            newSet.delete(prefix);
                                                        } else {
                                                            newSet.add(prefix);
                                                        }
                                                        return newSet;
                                                    });
                                                }}
                                                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                            <div className="flex-1">
                                                <span className="font-medium text-gray-900 dark:text-white">{prefix}</span>
                                                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                                    ({classCount} classes)
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        if (selectedImportPrefixes.size === targetCoursePrefixes.length) {
                                            setSelectedImportPrefixes(new Set());
                                        } else {
                                            setSelectedImportPrefixes(new Set(targetCoursePrefixes));
                                        }
                                    }}
                                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                    {selectedImportPrefixes.size === targetCoursePrefixes.length ? 'Deselect All' : 'Select All'}
                                </button>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowImportModal(false)}
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleImportSections}
                                        disabled={selectedImportPrefixes.size === 0}
                                        className={`
                                            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition
                                            ${selectedImportPrefixes.size === 0
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-green-500 text-white hover:bg-green-600'
                                            }
                                        `}
                                    >
                                        <Download className="w-4 h-4" />
                                        Import {selectedImportPrefixes.size} Programme{selectedImportPrefixes.size !== 1 ? 's' : ''}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Import Result Alert */}
                {importResult && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">{importResult.message || 'Import Complete'}</span>
                        </div>
                        {importResult.total_processed !== undefined && (
                            <div className="text-sm text-blue-600 dark:text-blue-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>Processed: <strong>{importResult.total_processed}</strong></div>
                                <div>Created: <strong className="text-green-600">{importResult.created}</strong></div>
                                <div>Updated: <strong className="text-yellow-600">{importResult.updated}</strong></div>
                                <div>Errors: <strong className="text-red-600">{importResult.errors}</strong></div>
                            </div>
                        )}
                    </div>
                )}

                {/* Missing Subjects Panel */}
                {missingSubjects.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">Missing Subjects Found ({missingSubjects.length})</span>
                        </div>
                        <p className="text-sm text-yellow-600 dark:text-yellow-300 mb-4">
                            The following subjects exist in the aSC Timetable but are missing from the database.
                            Select and edit the details, then click "Add Selected Subjects" to add them.
                        </p>

                        {/* Missing Subjects Table */}
                        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                        <th className="py-2 px-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedMissingSubjects.size === missingSubjects.length && missingSubjects.length > 0}
                                                onChange={toggleSelectAllMissingSubjects}
                                                className="rounded border-gray-300 dark:border-gray-600"
                                            />
                                        </th>
                                        <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-300 font-medium">Code</th>
                                        <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-300 font-medium">Name</th>
                                        <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-300 font-medium">Credit Hours</th>
                                        <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-300 font-medium">Semester</th>
                                        <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-300 font-medium">Programme</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {missingSubjects.map((subject) => (
                                        <tr
                                            key={subject.code}
                                            className={`border-b border-gray-100 dark:border-gray-700/50 
                                                ${selectedMissingSubjects.has(subject.code)
                                                    ? 'bg-yellow-50 dark:bg-yellow-900/10'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                        >
                                            <td className="py-2 px-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMissingSubjects.has(subject.code)}
                                                    onChange={() => toggleMissingSubjectSelection(subject.code)}
                                                    className="rounded border-gray-300 dark:border-gray-600"
                                                />
                                            </td>
                                            <td className="py-2 px-3 font-mono text-gray-900 dark:text-white font-medium">
                                                {subject.code}
                                            </td>
                                            <td className="py-2 px-3">
                                                {editingSubject === subject.code ? (
                                                    <input
                                                        type="text"
                                                        value={subject.name}
                                                        onChange={(e) => updateMissingSubject(subject.code, 'name', e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-gray-700 dark:text-gray-300">{subject.name}</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3">
                                                {editingSubject === subject.code ? (
                                                    <input
                                                        type="number"
                                                        value={subject.credit_hours}
                                                        onChange={(e) => updateMissingSubject(subject.code, 'credit_hours', parseInt(e.target.value) || 3)}
                                                        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        min="1"
                                                        max="6"
                                                    />
                                                ) : (
                                                    <span className="text-gray-700 dark:text-gray-300">{subject.credit_hours}</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3">
                                                {editingSubject === subject.code ? (
                                                    <input
                                                        type="number"
                                                        value={subject.semester}
                                                        onChange={(e) => updateMissingSubject(subject.code, 'semester', parseInt(e.target.value) || 1)}
                                                        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        min="1"
                                                        max="8"
                                                    />
                                                ) : (
                                                    <span className="text-gray-700 dark:text-gray-300">{subject.semester}</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3">
                                                <div className="flex items-center gap-2">
                                                    {editingSubject === subject.code ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={subject.programme}
                                                                onChange={(e) => updateMissingSubject(subject.code, 'programme', e.target.value)}
                                                                className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                            />
                                                            <button
                                                                onClick={() => setEditingSubject(null)}
                                                                className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                                                                title="Done editing"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-gray-700 dark:text-gray-300">{subject.programme}</span>
                                                            <button
                                                                onClick={() => setEditingSubject(subject.code)}
                                                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                                title="Edit details"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Subjects Button */}
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">
                                {selectedMissingSubjects.size} of {missingSubjects.length} selected
                            </span>
                            <button
                                onClick={handleAddMissingSubjects}
                                disabled={addingSubjects || selectedMissingSubjects.size === 0}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                                    transition-all duration-200
                                    ${addingSubjects || selectedMissingSubjects.size === 0
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                                        : 'bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow'
                                    }
                                `}
                            >
                                {addingSubjects ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Add Selected Subjects
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Alert */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Success indicator after sync */}
                {!error && data && !loading && !syncing && syncedAt && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>
                            Timetable data loaded: {data.teachers?.length || 0} lecturers, {data.subjects?.length || 0} subjects, {data.classes?.length || 0} classes
                        </span>
                    </div>
                )}
            </div>

            {/* No Data State */}
            {!data && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Timetable Data
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Click "Fetch Timetable" to sync data from UPTM Edupage system.
                    </p>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                    >
                        {syncing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5" />
                                Fetch Timetable Now
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Data Display */}
            {data && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <div className="flex overflow-x-auto">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap
                                        transition-colors duration-200
                                        ${activeTab === tab.id
                                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }
                                    `}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    <span className={`
                                        px-2 py-0.5 rounded-full text-xs
                                        ${activeTab === tab.id
                                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }
                                    `}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4">
                        <AnimatePresence mode="wait">
                            {/* Course Timetable Tab */}
                            {activeTab === 'timetable' && (
                                <motion.div
                                    key="timetable"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {/* Search Results (when search term is active) */}
                                    {searchTerm && searchTerm.trim().length > 0 && (() => {
                                        const term = searchTerm.toLowerCase();
                                        const matchingSubjects = (data.subjects || []).filter(s =>
                                            s.short?.toLowerCase().includes(term) || s.name?.toLowerCase().includes(term)
                                        );

                                        if (matchingSubjects.length === 0) {
                                            return (
                                                <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                                                    <Search className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                    <p className="text-gray-600 dark:text-gray-400 font-medium">No subjects found matching "{searchTerm}"</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try searching by subject code or name</p>
                                                </div>
                                            );
                                        }

                                        // For each matching subject, find lessons and associated classes (only from target programmes)
                                        const results = matchingSubjects.map(subject => {
                                            const subjectLessons = (data.lessons || []).filter(l => l.subjectid === subject.id);
                                            const classIds = [...new Set(subjectLessons.flatMap(l => l.classids || []))];
                                            const associatedClasses = classIds
                                                .map(cid => (data.classes || []).find(c => c.id === cid))
                                                .filter(Boolean)
                                                .filter(c => targetCoursePrefixes.some(prefix =>
                                                    c.short?.toUpperCase().startsWith(prefix) || c.name?.toUpperCase().startsWith(prefix)
                                                ));
                                            const teacherIds = [...new Set(subjectLessons.flatMap(l => l.teacherids || []))];
                                            const associatedTeachers = teacherIds
                                                .map(tid => (data.teachers || []).find(t => t.id === tid))
                                                .filter(Boolean);
                                            return { subject, lessons: subjectLessons, classes: associatedClasses, teachers: associatedTeachers };
                                        }).filter(r => r.classes.length > 0).slice(0, 20); // Filter first, THEN limit

                                        if (results.length === 0) {
                                            return (
                                                <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                                                    <Search className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                    <p className="text-gray-600 dark:text-gray-400 font-medium">No subjects found matching "{searchTerm}" in CT206, CT204 or CC101</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try searching by subject code or name</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="mb-6">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Search className="w-4 h-4 text-primary-500" />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {results.length} subject{results.length !== 1 ? 's' : ''} matching "{searchTerm}"
                                                    </span>
                                                </div>
                                                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                                                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Subject Code</th>
                                                                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Subject Name</th>
                                                                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Lecturer(s)</th>
                                                                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Classes</th>
                                                                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Lessons</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {results.map(({ subject, lessons, classes: cls, teachers }) => (
                                                                <tr
                                                                    key={subject.id}
                                                                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors"
                                                                >
                                                                    <td className="py-3 px-4">
                                                                        <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                                                                            {subject.short}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                                                                        {subject.name || '—'}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                                        {teachers.length > 0
                                                                            ? teachers.map(t => t.short || t.name).join(', ')
                                                                            : '—'
                                                                        }
                                                                    </td>
                                                                    <td className="py-3 px-4">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {cls.length > 0 ? cls.map(c => {
                                                                                const matchingPrefix = targetCoursePrefixes.find(prefix =>
                                                                                    c.short?.toUpperCase().startsWith(prefix) || c.name?.toUpperCase().startsWith(prefix)
                                                                                );
                                                                                return (
                                                                                    <button
                                                                                        key={c.id}
                                                                                        onClick={() => {
                                                                                            if (matchingPrefix) {
                                                                                                setSelectedPrefix(matchingPrefix);
                                                                                                setSelectedClass(c);
                                                                                                setRelatedClasses(cls);
                                                                                                setSearchTerm('');
                                                                                            }
                                                                                        }}
                                                                                        className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 hover:scale-105 transition-all cursor-pointer"
                                                                                        title={`View timetable for ${c.short || c.name}`}
                                                                                    >
                                                                                        {c.short || c.name}
                                                                                    </button>
                                                                                );
                                                                            }) : <span className="text-gray-400">—</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono">
                                                                        {lessons.length}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {matchingSubjects.length > 20 && (
                                                    <p className="text-xs text-gray-500 mt-2 text-center">Showing first 20 of {matchingSubjects.length} results</p>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Course Prefix Selector */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Select Programme
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {targetCoursePrefixes.map(prefix => {
                                                const classCount = classesGroupedByPrefix[prefix]?.length || 0;
                                                return (
                                                    <button
                                                        key={prefix}
                                                        onClick={() => {
                                                            setSelectedPrefix(selectedPrefix === prefix ? null : prefix);
                                                            setSelectedClass(null);
                                                            setRelatedClasses([]);
                                                        }}
                                                        className={`
                                                            px-4 py-2 rounded-lg font-medium transition-all duration-200
                                                            flex items-center gap-2
                                                            ${selectedPrefix === prefix
                                                                ? 'bg-primary-500 text-white shadow-md'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }
                                                        `}
                                                    >
                                                        <GraduationCap className="w-4 h-4" />
                                                        {prefix}
                                                        <span className={`
                                                            px-2 py-0.5 rounded-full text-xs
                                                            ${selectedPrefix === prefix
                                                                ? 'bg-white/20 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                                                            }
                                                        `}>
                                                            {classCount} classes
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Class Selector (when prefix is selected) */}
                                    {selectedPrefix && classesGroupedByPrefix[selectedPrefix]?.length > 0 && (
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Select Class/Semester
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                                {classesGroupedByPrefix[selectedPrefix]
                                                    .filter(cls => {
                                                        if (!searchTerm) return true;
                                                        const term = searchTerm.toLowerCase();
                                                        return (cls.short?.toLowerCase().includes(term) || cls.name?.toLowerCase().includes(term));
                                                    })
                                                    .map(cls => (
                                                        <button
                                                            key={cls.id}
                                                            onClick={() => { setSelectedClass(selectedClass?.id === cls.id ? null : cls); setRelatedClasses([]); }}
                                                            className={`
                                                            px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                                            ${selectedClass?.id === cls.id
                                                                    ? 'bg-green-500 text-white shadow-md'
                                                                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                                                }
                                                        `}
                                                        >
                                                            {cls.short || cls.name}
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Timetable Display */}
                                    {selectedClass ? (
                                        <div>
                                            {/* Class Header */}
                                            <div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/30 dark:to-blue-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {/* Prev Button */}
                                                        {relatedClasses.length > 1 && (
                                                            <button
                                                                onClick={() => navigateRelatedClass('prev')}
                                                                className="p-2 rounded-lg bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:border-primary-300 dark:hover:border-primary-700 transition-all text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                                                                title="Previous class"
                                                            >
                                                                <ChevronLeft className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                        <div>
                                                            <h3 className="text-xl font-bold text-primary-700 dark:text-primary-300">
                                                                {selectedClass.short || selectedClass.name}
                                                            </h3>
                                                            {selectedClass.name && selectedClass.name !== selectedClass.short && (
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedClass.name}</p>
                                                            )}
                                                            {relatedClasses.length > 1 && (
                                                                <p className="text-xs text-primary-500 dark:text-primary-400 font-medium mt-0.5">
                                                                    {relatedClasses.findIndex(c => c.id === selectedClass.id) + 1} of {relatedClasses.length} classes
                                                                </p>
                                                            )}
                                                        </div>
                                                        {/* Next Button */}
                                                        {relatedClasses.length > 1 && (
                                                            <button
                                                                onClick={() => navigateRelatedClass('next')}
                                                                className="p-2 rounded-lg bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:border-primary-300 dark:hover:border-primary-700 transition-all text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                                                                title="Next class"
                                                            >
                                                                <ChevronRight className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full">
                                                            {classTimetable?.classLessons?.length || 0} lessons
                                                        </span>
                                                        <span className="ml-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm font-medium rounded-full">
                                                            {classTimetable?.classCards?.length || 0} scheduled
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Weekly Timetable Grid - Days as rows, Periods as columns */}
                                            {classTimetable && classTimetable.periods?.length > 0 && (
                                                <div className="overflow-x-auto">
                                                    <div className="min-w-[1000px] relative">
                                                        {/* 1. Header Row (Periods) */}
                                                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2 sticky top-0 bg-white dark:bg-gray-800 z-20">
                                                            {/* Day Column Placeholder */}
                                                            <div className="w-16 md:w-24 flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"></div>

                                                            {/* Period Headers */}
                                                            <div className="flex-1 flex" style={{ display: 'grid', gridTemplateColumns: `repeat(${classTimetable.totalPeriods}, 1fr)` }}>
                                                                {classTimetable.periods.map(period => (
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
                                                            {classTimetable.days.map(day => {
                                                                const events = classTimetable.eventsByDay[day.id] || [];
                                                                const neededTracks = day.neededTracks || 1;
                                                                const trackHeight = 85;
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
                                                                                style={{ gridTemplateColumns: `repeat(${classTimetable.totalPeriods}, 1fr)` }}
                                                                            >
                                                                                {classTimetable.periods.map((_, i) => (
                                                                                    <div key={i} className={`border-l ${i === 0 ? 'border-transparent' : 'border-gray-200 dark:border-gray-700/50'} h-full`}></div>
                                                                                ))}
                                                                            </div>

                                                                            {/* Event Cards */}
                                                                            {events.map(event => {
                                                                                const widthPercent = (event.duration / classTimetable.totalPeriods) * 100;
                                                                                const leftPercent = (event.startIndex / classTimetable.totalPeriods) * 100;

                                                                                // Use trackIndex for vertical placement
                                                                                const topPos = event.trackIndex * trackHeight;
                                                                                const subjectCode = event.subject?.short || '';
                                                                                const isMentorMentee = subjectCode.toUpperCase().includes('MENTOR');
                                                                                const colorClass = getSubjectColor(subjectCode);

                                                                                return (
                                                                                    <div
                                                                                        key={event.id}
                                                                                        className={`absolute p-0.5 transition-all duration-200 hover:z-20`}
                                                                                        title={`${subjectCode} - ${event.subject?.name || ''}`}
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
                                                                                                {subjectCode || 'Unknown'}
                                                                                            </div>

                                                                                            {!isMentorMentee && (
                                                                                                <>
                                                                                                    {event.teachers?.length > 0 && (
                                                                                                        <div className="text-[10px] opacity-90 truncate leading-tight">
                                                                                                            {event.teachers.map(t => t.name || t.short).join(', ')}
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
                                            )}

                                            {classTimetable?.classCards?.length === 0 && (
                                                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                    <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        No scheduled classes found for this timetable.
                                                    </p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        The timetable may not be published yet.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : selectedPrefix ? (
                                        <div className="text-center py-12">
                                            <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                                Select a Class
                                            </h3>
                                            <p className="text-gray-500 dark:text-gray-400">
                                                Choose a specific class/semester from {selectedPrefix} above to view its timetable.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Grid3X3 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                                Select a Programme
                                            </h3>
                                            <p className="text-gray-500 dark:text-gray-400">
                                                Click on CT206, CT204, or CC101 above to browse available class timetables.
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Subjects Tab */}
                            {activeTab === 'subjects' && (
                                <motion.div
                                    key="subjects"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Code</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filterData(data.subjects, ['short', 'name'])?.map((subject, idx) => (
                                                    <tr
                                                        key={subject.id || idx}
                                                        className={`
                                                            border-b border-gray-100 dark:border-gray-700/50
                                                            ${isTargetCourse(subject.short)
                                                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                            }
                                                        `}
                                                    >
                                                        <td className="py-3 px-4">
                                                            <span className={`
                                                                font-mono font-medium
                                                                ${isTargetCourse(subject.short)
                                                                    ? 'text-primary-600 dark:text-primary-400'
                                                                    : 'text-gray-900 dark:text-white'
                                                                }
                                                            `}>
                                                                {subject.short}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{subject.name}</td>
                                                        <td className="py-3 px-4">
                                                            {isTargetCourse(subject.short) && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    Target Course
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {(!data.subjects || data.subjects.length === 0) && (
                                            <p className="text-center py-8 text-gray-500">No subjects found</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Teachers Tab */}
                            {activeTab === 'teachers' && (
                                <motion.div
                                    key="teachers"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Short</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filterData(data.teachers, ['short', 'name'])?.map((teacher, idx) => (
                                                    <tr
                                                        key={teacher.id || idx}
                                                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                    >
                                                        <td className="py-3 px-4 font-mono text-gray-900 dark:text-white">{teacher.short}</td>
                                                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{teacher.name}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {(!data.teachers || data.teachers.length === 0) && (
                                            <p className="text-center py-8 text-gray-500">No lecturers found</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Classes Tab */}
                            {activeTab === 'classes' && (
                                <motion.div
                                    key="classes"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Short</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filterData(data.classes, ['short', 'name'])?.map((cls, idx) => (
                                                    <tr
                                                        key={cls.id || idx}
                                                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                    >
                                                        <td className="py-3 px-4 font-mono text-gray-900 dark:text-white">{cls.short}</td>
                                                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{cls.name}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {(!data.classes || data.classes.length === 0) && (
                                            <p className="text-center py-8 text-gray-500">No classes found</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Classrooms Tab */}
                            {activeTab === 'classrooms' && (
                                <motion.div
                                    key="classrooms"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Short</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filterData(data.classrooms, ['short', 'name'])?.map((room, idx) => (
                                                    <tr
                                                        key={room.id || idx}
                                                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                    >
                                                        <td className="py-3 px-4 font-mono text-gray-900 dark:text-white">{room.short}</td>
                                                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{room.name}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {(!data.classrooms || data.classrooms.length === 0) && (
                                            <p className="text-center py-8 text-gray-500">No rooms found</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Lessons/Timetable Tab */}
                            {activeTab === 'lessons' && (
                                <motion.div
                                    key="lessons"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">ID</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Subject</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Teacher</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Class</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Room</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Period</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Days</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.lessons?.slice(0, 50).map((lesson, idx) => {
                                                    // Find related entities
                                                    const subject = data.subjects?.find(s => s.id === lesson.subjectid);
                                                    const teacher = data.teachers?.find(t => t.id === lesson.teacherid);
                                                    const classroom = data.classrooms?.find(r => r.id === lesson.classroomid);
                                                    const cls = data.classes?.find(c => c.id === lesson.classid);
                                                    const period = data.periods?.find(p => p.id === lesson.periodid);

                                                    return (
                                                        <tr
                                                            key={lesson.id || idx}
                                                            className={`
                                                                border-b border-gray-100 dark:border-gray-700/50
                                                                ${isTargetCourse(subject?.short)
                                                                    ? 'bg-primary-50 dark:bg-primary-900/20'
                                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                                }
                                                            `}
                                                        >
                                                            <td className="py-3 px-4 font-mono text-xs text-gray-500">{lesson.id}</td>
                                                            <td className="py-3 px-4">
                                                                <span className={`font-medium ${isTargetCourse(subject?.short) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                                                                    {subject?.short || lesson.subjectid || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{teacher?.short || lesson.teacherid || '-'}</td>
                                                            <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{cls?.short || lesson.classid || '-'}</td>
                                                            <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{classroom?.short || lesson.classroomid || '-'}</td>
                                                            <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{period?.name || lesson.periodid || '-'}</td>
                                                            <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{lesson.days || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {data.lessons?.length > 50 && (
                                            <p className="text-center py-4 text-sm text-gray-500">
                                                Showing 50 of {data.lessons.length} lessons
                                            </p>
                                        )}
                                        {(!data.lessons || data.lessons.length === 0) && (
                                            <p className="text-center py-8 text-gray-500">No lessons found</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EdupageDataView;
