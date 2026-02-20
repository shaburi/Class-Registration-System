import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    closestCenter
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle,
    X,
    GripVertical,
    Send,
    RotateCcw,
    Filter,
    Loader2,
    MapPin,
    User,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

// Constants
// Constants
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'MON', tuesday: 'TUE', wednesday: 'WED', thursday: 'THU', friday: 'FRI', saturday: 'SAT', sunday: 'SUN' };
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

// Color palette for subjects
const SUBJECT_COLORS = [
    { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-100' },
    { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-100' },
    { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-cyan-100' },
    { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-rose-100' },
    { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-100' },
    { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-amber-100' },
    { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-100' },
    { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-teal-100' },
    { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-cyan-100' },
    { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-100' },
];

// Draggable Section Card for sidebar
function DraggableSectionCard({ section, colorClass, isPlaced, isDisabled, isRegistered }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: section.id,
        data: { section },
        disabled: isDisabled
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : 1
    } : undefined;

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${colorClass} text-white p-4 rounded-xl shadow-lg transition-all relative group
                ${isPlaced || isRegistered ? 'opacity-50 grayscale-[0.5] ring-1 ring-gray-200 dark:ring-gray-700' : 'cursor-grab active:cursor-grabbing hover:shadow-xl hover:scale-[1.02] hover:rotate-1'}
                ${isDragging ? 'opacity-90 scale-105 rotate-2 shadow-2xl z-50' : ''}
                ${isDisabled && !isPlaced && !isRegistered ? 'opacity-40 cursor-not-allowed' : ''}
            `}
        >
            {(isPlaced || isRegistered) && (
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg">
                    <CheckCircle className="w-3 h-3" />
                </div>
            )}
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-bold text-sm">{section.subject_code}</p>
                    <p className="text-xs opacity-90 truncate max-w-[120px]">{section.subject_name}</p>
                </div>
                <GripVertical className="w-4 h-4 opacity-60" />
            </div>
            <div className="mt-2 text-xs opacity-80 space-y-0.5">
                <p>Sec {section.section_number}</p>
                {/* Show all schedules */}
                {section.schedules && section.schedules.length > 0 ? (
                    section.schedules.slice(0, 2).map((sched, idx) => (
                        <p key={idx} className="capitalize">{sched.day} {sched.start_time?.slice(0, 5)}-{sched.end_time?.slice(0, 5)}</p>
                    ))
                ) : (
                    <p className="capitalize">{section.day || 'TBA'} {section.start_time?.slice(0, 5)}-{section.end_time?.slice(0, 5)}</p>
                )}
                {section.schedules && section.schedules.length > 2 && (
                    <p className="text-white/60">+{section.schedules.length - 2} more</p>
                )}
                <p>{section.enrolled_count}/{section.capacity} seats</p>
            </div>
            {section.is_full && (
                <div className="mt-2 bg-red-600/80 text-xs px-2 py-0.5 rounded-full text-center">FULL</div>
            )}
            {isRegistered && (
                <div className="mt-2 bg-emerald-600/80 text-xs px-2 py-0.5 rounded-full text-center">✓ Registered</div>
            )}
            {isPlaced && !isRegistered && (
                <div className="mt-2 bg-white/20 text-xs px-2 py-0.5 rounded-full text-center">✓ Added</div>
            )}
        </motion.div>
    );
}

// Timetable Block (displayed in grid)
function TimetableBlock({ section, colorClass, onRemove, isRegistered, style }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05, zIndex: 100 }}
            className={`absolute ${colorClass.bg} border-l-[6px] ${colorClass.border} rounded-r-lg rounded-l-sm p-2 shadow-sm transition-all group overflow-hidden bg-opacity-90 backdrop-blur-[2px] cursor-pointer hover:shadow-xl hover:ring-2 hover:ring-white/50`}
            style={style}
        >
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-white truncate">{section.subject_code}</p>
                    <p className="text-xs text-white/80">Sec {section.section_number}</p>
                </div>
                {!isRegistered && (
                    <button
                        onClick={() => onRemove(section.id)}
                        className="p-1 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40 flex-shrink-0"
                    >
                        <X className="w-3 h-3 text-white" />
                    </button>
                )}
            </div>
            {section.room && (
                <div className="flex items-center gap-1 mt-1 text-xs text-white/70">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{section.room}</span>
                </div>
            )}
            {section.lecturer_name && (
                <div className="flex items-center gap-1 text-xs text-white/70">
                    <User className="w-3 h-3" />
                    <span className="truncate">{section.lecturer_name}</span>
                </div>
            )}
            {isRegistered && (
                <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                    <CheckCircle className="w-3 h-3 text-white" />
                </div>
            )}
        </motion.div>
    );
}

// Droppable Day Row
function DroppableRow({ day, children }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `row-${day}`,
        data: { day }
    });

    return (
        <div
            ref={setNodeRef}
            className={`relative h-20 border-b border-gray-200 dark:border-gray-700 transition-colors ${isOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        >
            {children}
        </div>
    );
}

// Main Component
export default function TimetableBuilder({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [globalTimetable, setGlobalTimetable] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [placedSections, setPlacedSections] = useState({}); // { sectionId: section }
    const [registeredSections, setRegisteredSections] = useState({}); // Already registered
    const [activeSection, setActiveSection] = useState(null);
    const [subjectColors, setSubjectColors] = useState({});

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [semesterFilter, setSemesterFilter] = useState('current'); // 'current', 'all', or specific number
    const [studentSemester, setStudentSemester] = useState(null);


    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        })
    );

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load both global timetable and current registrations
            const [timetableRes, registrationsRes] = await Promise.all([
                api.get('/student/global-timetable'),
                api.get('/student/registrations')
            ]);

            const timetableData = timetableRes.data.data;
            setGlobalTimetable(timetableData);
            setStudentSemester(timetableData.semester); // Store student's semester

            // Set first group as default
            const groups = Object.keys(timetableData.groups || {});
            if (groups.length > 0) {
                setSelectedGroup(groups[0]);
            }

            // Load registered sections
            const regs = registrationsRes.data.data || registrationsRes.data || [];
            const registeredMap = {};
            regs.forEach(reg => {
                registeredMap[reg.section_id || reg.id] = {
                    id: reg.section_id || reg.id,
                    subject_code: reg.subject_code || reg.code,
                    subject_name: reg.subject_name || reg.name,
                    subject_id: reg.subject_id,
                    section_number: reg.section_number,
                    day: reg.day,
                    start_time: reg.start_time,
                    end_time: reg.end_time,
                    room: reg.room,
                    building: reg.building,
                    lecturer_name: reg.lecturer_name,
                    capacity: reg.capacity,
                    enrolled_count: reg.enrolled_count
                };
            });
            setRegisteredSections(registeredMap);

            // Assign colors to subjects
            const colors = {};
            const allSections = [...(timetableData.allSections || []), ...Object.values(registeredMap)];
            allSections.forEach((section, i) => {
                if (!colors[section.subject_id]) {
                    colors[section.subject_id] = SUBJECT_COLORS[Object.keys(colors).length % SUBJECT_COLORS.length];
                }
            });
            setSubjectColors(colors);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    // Get unique semesters from all sections
    const availableSemesters = useMemo(() => {
        if (!globalTimetable?.allSections) return [];
        const semesters = [...new Set(globalTimetable.allSections.map(s => s.subject_semester))];
        return semesters.sort((a, b) => a - b);
    }, [globalTimetable]);

    // Get available sections with search and semester filter
    const availableSections = useMemo(() => {
        if (!globalTimetable?.allSections) return [];

        let sections = globalTimetable.allSections;

        // Filter by semester
        if (semesterFilter !== 'all') {
            const targetSemester = semesterFilter === 'current' ? studentSemester : parseInt(semesterFilter);
            sections = sections.filter(s => s.subject_semester === targetSemester);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            sections = sections.filter(s =>
                s.subject_code?.toLowerCase().includes(query) ||
                s.subject_name?.toLowerCase().includes(query) ||
                s.lecturer_name?.toLowerCase().includes(query)
            );
        }

        // Sort: student's current semester first, then by code
        return sections.sort((a, b) => {
            // Current semester subjects first
            if (a.subject_semester === studentSemester && b.subject_semester !== studentSemester) return -1;
            if (a.subject_semester !== studentSemester && b.subject_semester === studentSemester) return 1;
            // Then by semester
            if (a.subject_semester !== b.subject_semester) return a.subject_semester - b.subject_semester;
            // Then by code
            return (a.subject_code || '').localeCompare(b.subject_code || '');
        });
    }, [globalTimetable, searchQuery, semesterFilter, studentSemester]);

    // Combined sections (registered + newly placed)
    const allDisplayedSections = useMemo(() => {
        return { ...registeredSections, ...placedSections };
    }, [registeredSections, placedSections]);

    // Expand sections with multiple schedules into individual display blocks
    // Each schedule becomes a separate block on the timetable
    const allDisplayBlocks = useMemo(() => {
        const blocks = [];
        Object.values(allDisplayedSections).forEach(section => {
            if (section.schedules && section.schedules.length > 0) {
                // Create a block for each schedule
                section.schedules.forEach((sched, idx) => {
                    blocks.push({
                        ...section,
                        blockId: `${section.id}_${idx}`,
                        day: sched.day,
                        start_time: sched.start_time,
                        end_time: sched.end_time,
                        room: sched.room || section.room
                    });
                });
            } else {
                // Fallback: use section's own day/time
                blocks.push({
                    ...section,
                    blockId: section.id
                });
            }
        });
        return blocks;
    }, [allDisplayedSections]);

    // Placed section IDs (not including already registered)
    const newlyPlacedIds = Object.keys(placedSections);

    // Check if a section would conflict with currently placed/registered sections
    const wouldConflict = (newSection) => {
        // Get all schedule times for the new section
        const newSchedules = newSection.schedules && newSection.schedules.length > 0
            ? newSection.schedules
            : [{ day: newSection.day, start_time: newSection.start_time, end_time: newSection.end_time }];

        // Check against all existing display blocks
        for (const existing of allDisplayBlocks) {
            for (const newSched of newSchedules) {
                if (existing.day === newSched.day) {
                    const aStart = existing.start_time;
                    const aEnd = existing.end_time;
                    const bStart = newSched.start_time;
                    const bEnd = newSched.end_time;

                    if (aStart < bEnd && bStart < aEnd) {
                        return existing;
                    }
                }
            }
        }
        return null;
    };

    const handleDragStart = (event) => {
        const section = event.active.data.current?.section;
        setActiveSection(section);
    };

    const handleDragEnd = (event) => {
        setActiveSection(null);
        const { active, over } = event;

        if (!over) return;

        const section = active.data.current?.section;
        if (!section) return;

        // If already placed or registered, do nothing
        if (placedSections[section.id] || registeredSections[section.id]) {
            return;
        }

        // Check if already have this subject (any section) in placed or registered
        const allCurrentSections = { ...registeredSections, ...placedSections };
        const duplicateSubject = Object.values(allCurrentSections).find(
            s => s.subject_id === section.subject_id && s.id !== section.id
        );
        if (duplicateSubject) {
            toast.error(`Already have ${section.subject_code} (Section ${duplicateSubject.section_number}). Cannot add multiple sections of the same subject.`);
            return;
        }

        // Check for time conflict before placing
        const conflictingSection = wouldConflict(section);
        if (conflictingSection) {
            toast.error(`Conflicts with ${conflictingSection.subject_code}! Remove it first.`);
            return;
        }

        setPlacedSections(prev => ({
            ...prev,
            [section.id]: section
        }));

        toast.success(`Added ${section.subject_code} to timetable`);
    };

    const handleRemoveSection = (sectionId) => {
        // Can't remove registered sections
        if (registeredSections[sectionId]) {
            toast.error('Cannot remove already registered classes');
            return;
        }
        setPlacedSections(prev => {
            const newPlaced = { ...prev };
            delete newPlaced[sectionId];
            return newPlaced;
        });
        toast.success('Removed from timetable');
    };

    const handleClearAll = () => {
        setPlacedSections({});
    };

    const handleSubmit = async () => {
        const sectionIds = Object.keys(placedSections);
        if (sectionIds.length === 0) {
            toast.error('No new classes to register');
            return;
        }

        try {
            setSubmitting(true);
            const response = await api.post('/student/bulk-register', { sectionIds });
            const result = response.data.data;

            if (result.totalRegistered > 0) {
                toast.success(`Registered for ${result.totalRegistered} classes!`);
            }

            if (result.failed.length > 0) {
                result.failed.forEach(f => {
                    toast.error(`${f.code}: ${f.reason}`);
                });
            }

            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate position and size for a section block
    const getBlockStyle = (section) => {
        const startHour = parseInt(section.start_time?.split(':')[0]) || 8;
        const endHour = parseInt(section.end_time?.split(':')[0]) || startHour + 1;
        const startMin = parseInt(section.start_time?.split(':')[1]) || 0;
        const endMin = parseInt(section.end_time?.split(':')[1]) || 0;

        const startOffset = (startHour - 8) + (startMin / 60);
        const duration = (endHour - startHour) + ((endMin - startMin) / 60);

        const hourWidth = 60; // pixels per hour
        const left = startOffset * hourWidth;
        const width = duration * hourWidth - 4; // -4 for gap

        return {
            left: `${left}px`,
            width: `${width}px`,
            top: '4px',
            bottom: '4px'
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            Timetable Builder
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Drag classes onto the grid • {Object.keys(registeredSections).length} registered
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Group Selector */}
                        {globalTimetable?.groups && Object.keys(globalTimetable.groups).length > 1 && (
                            <select
                                value={selectedGroup || ''}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                            >
                                {Object.keys(globalTimetable.groups).map(group => (
                                    <option key={group} value={group}>Group {group}</option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={handleClearAll}
                            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Clear New
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || newlyPlacedIds.length === 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Register New ({newlyPlacedIds.length})
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Available Sections Panel */}
                    <div className="w-72 flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 overflow-hidden shadow-sm flex flex-col">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Filter className="w-4 h-4 text-blue-500" />
                            Available Classes
                            <span className="ml-auto text-xs font-normal text-gray-500 lowercase">
                                {availableSections.length} found
                            </span>
                        </h3>

                        {/* Search Box */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search subjects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                >
                                    <X className="w-3 h-3 text-gray-500" />
                                </button>
                            )}
                        </div>

                        {/* Semester Filter Buttons */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            <button
                                onClick={() => setSemesterFilter('current')}
                                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${semesterFilter === 'current'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Sem {studentSemester}
                            </button>
                            {availableSemesters.filter(s => s !== studentSemester).map(sem => (
                                <button
                                    key={sem}
                                    onClick={() => setSemesterFilter(String(sem))}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${semesterFilter === String(sem)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    Sem {sem}
                                </button>
                            ))}
                            <button
                                onClick={() => setSemesterFilter('all')}
                                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${semesterFilter === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                All
                            </button>
                        </div>

                        {/* Section Cards */}
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {availableSections.map(section => {
                                const isPlaced = !!placedSections[section.id];
                                const isRegistered = !!registeredSections[section.id];

                                return (
                                    <DraggableSectionCard
                                        key={section.id}
                                        section={section}
                                        colorClass={subjectColors[section.subject_id]?.bg || 'bg-gray-500'}
                                        isPlaced={isPlaced}
                                        isRegistered={isRegistered}
                                        isDisabled={isPlaced || isRegistered}
                                    />
                                );
                            })}
                            {availableSections.length === 0 && (
                                <div className="text-center py-8">
                                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm text-gray-500">No sections found</p>
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                                        >
                                            Clear search
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timetable Grid - Traditional Layout */}
                    <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
                        <div className="min-w-[1000px]">
                            {/* Header Row - Hours */}
                            <div className="flex border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
                                <div className="w-16 flex-shrink-0 p-2 text-center text-xs font-semibold text-gray-500 uppercase border-r border-gray-200 dark:border-gray-700">
                                    DAY
                                </div>
                                <div className="flex-1 flex">
                                    {HOURS.map(hour => (
                                        <div key={hour} className="w-[60px] flex-shrink-0 p-2 text-center text-xs font-semibold text-gray-500 border-r border-gray-100 dark:border-gray-800">
                                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Day Rows */}
                            {DAYS.map(day => (
                                <DroppableRow key={day} day={day}>
                                    {/* Day Label */}
                                    <div className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700">
                                        {DAY_LABELS[day]}
                                    </div>

                                    {/* Hour grid lines */}
                                    <div className="absolute left-16 right-0 top-0 bottom-0 flex">
                                        {HOURS.map(hour => (
                                            <div key={hour} className="w-[60px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800" />
                                        ))}
                                    </div>

                                    {/* Section blocks */}
                                    <div className="absolute left-16 right-0 top-0 bottom-0">
                                        {allDisplayBlocks
                                            .filter(block => block.day === day)
                                            .map(block => (
                                                <TimetableBlock
                                                    key={block.blockId}
                                                    section={block}
                                                    colorClass={subjectColors[block.subject_id] || SUBJECT_COLORS[0]}
                                                    onRemove={handleRemoveSection}
                                                    isRegistered={!!registeredSections[block.id]}
                                                    style={getBlockStyle(block)}
                                                />
                                            ))}
                                    </div>
                                </DroppableRow>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-500 dark:text-gray-400">
                            <span className="text-emerald-600 font-medium">{Object.keys(registeredSections).length}</span> registered
                            {newlyPlacedIds.length > 0 && (
                                <> • <span className="text-blue-600 font-medium">{newlyPlacedIds.length}</span> new</>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-emerald-500" />
                            <span className="text-gray-500">Registered</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span className="text-gray-500">New</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeSection && (
                    <div className={`${subjectColors[activeSection.subject_id]?.bg || 'bg-blue-500'} text-white p-3 rounded-xl shadow-2xl`}>
                        <p className="font-bold text-sm">{activeSection.subject_code}</p>
                        <p className="text-xs opacity-90">{activeSection.subject_name}</p>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
