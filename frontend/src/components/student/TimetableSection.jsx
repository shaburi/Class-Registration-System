import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, User, RefreshCw, X, Calendar } from 'lucide-react';
// getSubjectColor helper is internal now
import ExportDropdown from '../ExportDropdown';

// Consistent gradient color blocks identical to TimetableBuilder
const getSubjectColorHelper = (code) => {
    const gradients = [
        'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(99,102,241,0.3)]',
        'bg-gradient-to-br from-rose-500 to-pink-600 border-rose-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(244,63,94,0.3)]',
        'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(16,185,129,0.3)]',
        'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(245,158,11,0.3)]',
        'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(6,182,212,0.3)]',
        'bg-gradient-to-br from-violet-500 to-fuchsia-600 border-violet-400/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(139,92,246,0.3)]',
        'bg-gradient-to-br from-[#1a1d29] to-[#0d0f18] border-gray-600/50 text-gray-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_10px_rgba(0,0,0,0.4)]',
        'bg-gradient-to-br from-red-600 to-rose-700 border-red-500/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(220,38,38,0.3)]',
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

const TimetableSection = ({ registrations, onUnregister, onSwap }) => {
    // Days and Time Config
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Dynamically calculate end hour based on registrations to save horizontal space
    const { startHour, endHour, totalPeriods } = useMemo(() => {
        let max = 18; // Default to 6 PM
        if (registrations && registrations.length > 0) {
            registrations.forEach(reg => {
                const schedules = reg.schedules && reg.schedules.length > 0
                    ? reg.schedules
                    : [{ start_time: reg.start_time, end_time: reg.end_time }];

                schedules.forEach(schedule => {
                    if (schedule.end_time) {
                        const endH = parseInt(schedule.end_time.split(':')[0]);
                        if (!isNaN(endH) && endH > max) max = endH;
                    }
                });
            });
        }
        if (max > 22) max = 22;
        return { startHour: 8, endHour: max, totalPeriods: max - 8 };
    }, [registrations]);

    const trackHeight = 88; // Reduced height to fit perfectly

    // Generate Periods for Header - HOP STYLE with numbered periods
    const periods = useMemo(() => {
        return Array.from({ length: totalPeriods }, (_, i) => {
            const hour = startHour + i;
            const nextHour = hour + 1;

            return {
                id: i,
                hour: hour,
                name: String(i + 1),
                starttime: `${hour}:00`,
                endtime: `${nextHour}:00`
            };
        });
    }, [totalPeriods, startHour]);


    // Process Registrations into Events with Layout Logic
    const timetableData = useMemo(() => {
        const eventsByDay = {};
        const grid = {}; // day -> periodIndex -> items[]

        days.forEach(day => {
            eventsByDay[day] = [];
            grid[day] = {};
            for (let i = 0; i < totalPeriods; i++) {
                grid[day][i] = [];
            }
        });

        registrations.forEach(reg => {
            // Get all schedules - use schedules array if available, otherwise use single day/time
            const schedules = reg.schedules && reg.schedules.length > 0
                ? reg.schedules
                : [{ day: reg.day, start_time: reg.start_time, end_time: reg.end_time, room: reg.room }];

            // Create an event for EACH schedule (handles multi-day courses like Mon + Fri)
            schedules.forEach((schedule, scheduleIndex) => {
                if (!schedule.day) return;
                const dayName = schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1).toLowerCase();
                if (!grid[dayName]) return;

                const startH = parseInt(schedule.start_time?.split(':')[0]) || 8;
                const endH = parseInt(schedule.end_time?.split(':')[0]) || startH + 1;
                const startIndex = startH - startHour;
                const duration = Math.max(1, endH - startH);

                if (startIndex < 0 || startIndex >= totalPeriods) return;

                const event = {
                    ...reg,
                    id: `${reg.registration_id}-${scheduleIndex}`,
                    day: schedule.day,
                    start_time: schedule.start_time,
                    end_time: schedule.end_time,
                    room: schedule.room,
                    startIndex,
                    duration,
                    trackIndex: 0,
                    totalTracks: 1
                };

                eventsByDay[dayName].push(event);
            });
        });

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
    }, [registrations, days, totalPeriods, startHour]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white/80 dark:bg-[#0b0d14]/80 backdrop-blur-2xl rounded-[32px] border border-gray-200/50 dark:border-white/5 p-8 relative overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)]"
        >
            <div className="absolute top-[-50%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="font-bold text-2xl text-gray-900 dark:text-white font-heading tracking-tight flex items-center gap-3">
                    <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl border border-indigo-500/20 shadow-inner">
                        <Calendar className="w-5 h-5" />
                    </span>
                    My Timetable
                </h3>
                <ExportDropdown
                    elementId="student-timetable"
                    filename="my-timetable"
                    title="My Weekly Schedule"
                />
            </div>

            <div id="student-timetable" className="relative rounded-[20px] pb-4 bg-white/50 dark:bg-[rgba(0,0,0,0.2)] backdrop-blur-md border border-gray-200/50 dark:border-white/10 shadow-lg dark:shadow-2xl z-10 w-full overflow-hidden">
                <div className="w-full relative">
                    {/* Header Row - HOP STYLE */}
                    <div className="flex border-b border-gray-200/50 dark:border-white/10 mb-0 sticky top-0 bg-white/95 dark:bg-[#07090e]/95 backdrop-blur-2xl z-20 shadow-sm">
                        <div className="w-12 md:w-16 flex-shrink-0 bg-gray-50/80 dark:bg-white/5 border-r border-gray-200/50 dark:border-white/10"></div>
                        <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}>
                            {periods.map(period => (
                                <div key={period.id} className="text-center p-2 border-l border-gray-200/50 dark:border-white/5">
                                    <div className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">{period.name}</div>
                                    <div className="text-[10px] text-indigo-600 dark:text-indigo-300/80 font-medium tracking-widest">{period.starttime}-{period.endtime}</div>
                                </div>
                            ))}
                        </div>
                    </div>


                    {/* Day Rows - HOP STYLE */}
                    <div className="pb-4 dark:bg-[#0b0d14]/70">
                        {days.map(day => {
                            const events = timetableData.eventsByDay[day] || [];
                            const neededTracks = events.neededTracks || 1;
                            const rowHeight = Math.max(trackHeight, neededTracks * trackHeight);

                            return (
                                <div key={day} className="flex border-b border-gray-200/50 dark:border-white/5 group relative">
                                    {/* Day Name Label */}
                                    <div className="w-12 md:w-16 flex-shrink-0 flex items-center justify-center font-bold text-[10px] md:text-[11px] uppercase tracking-widest text-indigo-600 dark:text-indigo-300/60 bg-gray-50 dark:bg-white/5 border-r border-gray-200/50 dark:border-white/5 z-10 group-hover:bg-gray-100 dark:group-hover:bg-white/10 transition-colors">
                                        {day.substring(0, 3)}
                                    </div>

                                    {/* Events Container */}
                                    <div
                                        className="flex-1 relative transition-colors duration-300 hover:bg-black/5 dark:hover:bg-white/5"
                                        style={{ height: `${rowHeight}px` }}
                                    >
                                        {/* Grid Lines */}
                                        <div
                                            className="absolute inset-0 pointer-events-none grid"
                                            style={{ gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}
                                        >
                                            {periods.map((_, i) => (
                                                <div key={i} className={`border-l ${i === 0 ? 'border-transparent' : 'border-gray-200/50 dark:border-white/5'} h-full transition-colors group-hover:border-gray-300 dark:group-hover:border-white/10`}></div>
                                            ))}
                                        </div>


                                        {/* Event Cards */}
                                        {events.map((event, idx) => {
                                            const widthPercent = (event.duration / totalPeriods) * 100;
                                            const leftPercent = (event.startIndex / totalPeriods) * 100;
                                            const topPos = event.trackIndex * trackHeight;
                                            const colorClass = getSubjectColorHelper(event.subject_code);

                                            return (
                                                <motion.div
                                                    key={event.id || idx}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    whileHover={{ scale: 1.02, zIndex: 50 }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                    className="absolute p-1 group/card hover:z-20"
                                                    style={{
                                                        left: `${leftPercent}%`,
                                                        width: `${widthPercent}%`,
                                                        top: `${topPos}px`,
                                                        height: `${trackHeight}px`
                                                    }}
                                                >
                                                    <div className={`
                                                        h-full w-full rounded-[14px] border ${colorClass} 
                                                        flex flex-col justify-between overflow-hidden relative group/event transition-all duration-300
                                                    `}>
                                                        <div className="absolute inset-0 bg-white/20 dark:bg-white/10 opacity-0 group-hover/event:opacity-100 transition-opacity pointer-events-none rounded-[14px]"></div>
                                                        <div className="relative z-10 p-1.5 flex flex-col h-full">
                                                            <div>
                                                                <div className="font-extrabold text-[10px] leading-tight mb-0.5 break-words line-clamp-2 drop-shadow-md" title={event.subject_name}>
                                                                    {event.subject_code}
                                                                </div>
                                                                <div className="text-[8px] opacity-80 line-clamp-1 leading-tight">{event.subject_name}</div>
                                                            </div>

                                                            <div className="flex items-center justify-between mt-0.5">
                                                                <span className="font-bold bg-white/20 dark:bg-black/30 px-1 py-0.5 rounded text-[8px] backdrop-blur-sm border border-white/20">
                                                                    Sec {event.section_number}
                                                                </span>
                                                            </div>

                                                            {/* Details */}
                                                            <div className="mt-auto space-y-[1px] text-white">
                                                                <div className="flex items-center gap-1 opacity-90 text-[9px] truncate drop-shadow-sm">
                                                                    <LayoutGrid className="w-2.5 h-2.5 flex-shrink-0" />
                                                                    <span className="truncate font-bold tracking-wide">{event.room || 'TBA'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-80 text-[9px] truncate drop-shadow-sm">
                                                                    <User className="w-2.5 h-2.5 flex-shrink-0" />
                                                                    <span className="truncate font-semibold">{event.lecturer_name || 'Staff'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Action Buttons Overlay */}
                                                            <div className="absolute top-1.5 right-1.5 border border-gray-200 dark:border-white/10 flex flex-col gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/95 dark:bg-[#07090e]/80 p-1.5 rounded-xl backdrop-blur-xl shadow-lg">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onSwap(event.registration_id); }}
                                                                    className="p-1.5 bg-gray-50/50 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm transition-all hover:scale-110 border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30"
                                                                    title="Swap Section"
                                                                >
                                                                    <RefreshCw size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onUnregister(event.registration_id); }}
                                                                    className="p-1.5 bg-gray-50/50 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg shadow-sm transition-all hover:scale-110 border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
                                                                    title="Drop Course"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
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
            </div>
        </motion.div>
    );
};

export default TimetableSection;
