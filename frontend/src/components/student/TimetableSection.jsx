import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, User, RefreshCw, X } from 'lucide-react';
// getSubjectColor helper is internal now
import ExportDropdown from '../ExportDropdown';

// Simplified helper if not imported
const getSubjectColorHelper = (code) => {
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
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

const TimetableSection = ({ registrations, onUnregister, onSwap }) => {
    // Days and Time Config
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const startHour = 8;
    const endHour = 22; // 10 PM
    const totalPeriods = endHour - startHour;

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
                    room: schedule.room || reg.room,
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
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">📅</span>
                    My Timetable
                </h3>
                <ExportDropdown
                    elementId="student-timetable"
                    filename="my-timetable"
                    title="My Weekly Schedule"
                />
            </div>

            <div id="student-timetable" className="pb-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                <div className="min-w-[1000px] relative">
                    {/* Header Row - HOP STYLE */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2 sticky top-0 bg-white dark:bg-gray-800 z-20">
                        <div className="w-16 md:w-24 flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"></div>
                        <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}>
                            {periods.map(period => (
                                <div key={period.id} className="text-center p-2 border-l border-gray-100 dark:border-gray-700">
                                    <div className="font-bold text-sm text-gray-700 dark:text-gray-300">{period.name}</div>
                                    <div className="text-[10px] text-gray-500">{period.starttime}-{period.endtime}</div>
                                </div>
                            ))}
                        </div>
                    </div>


                    {/* Day Rows - HOP STYLE */}
                    <div className="space-y-2 pb-4">
                        {days.map(day => {
                            const events = timetableData.eventsByDay[day] || [];
                            const neededTracks = events.neededTracks || 1;
                            const trackHeight = 85;
                            const rowHeight = Math.max(trackHeight, neededTracks * trackHeight);

                            return (
                                <div key={day} className="flex border-b border-gray-100 dark:border-gray-700 pb-2">
                                    {/* Day Name Label */}
                                    <div className="w-16 md:w-24 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-l-lg border-y border-l border-gray-200 dark:border-gray-700 z-10">
                                        {day.substring(0, 3)}
                                    </div>

                                    {/* Events Container */}
                                    <div
                                        className="flex-1 relative bg-gray-50/50 dark:bg-gray-800/30 rounded-r-lg border border-gray-200 dark:border-gray-700"
                                        style={{ height: `${rowHeight}px` }}
                                    >
                                        {/* Grid Lines */}
                                        <div
                                            className="absolute inset-0 pointer-events-none grid"
                                            style={{ gridTemplateColumns: `repeat(${totalPeriods}, 1fr)` }}
                                        >
                                            {periods.map((_, i) => (
                                                <div key={i} className={`border-l ${i === 0 ? 'border-transparent' : 'border-gray-200 dark:border-gray-700/50'} h-full`}></div>
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
                                                    className="absolute p-0.5 transition-all duration-200 hover:z-30 group/card"
                                                    style={{
                                                        left: `${leftPercent}%`,
                                                        width: `${widthPercent}%`,
                                                        top: `${topPos}px`,
                                                        height: `${trackHeight}px`
                                                    }}
                                                >
                                                    <div className={`
                                                    h-full w-full rounded-lg shadow-sm border-l-4 ${colorClass} 
                                                    text-xs flex flex-col justify-between p-2 overflow-hidden
                                                    relative hover:shadow-lg transition-all
                                                `}>
                                                        {/* Subject Code */}
                                                        <div>
                                                            <div className="font-bold text-[11px] leading-tight mb-0.5 break-words line-clamp-2" title={event.subject_name}>
                                                                {event.subject_code}
                                                            </div>
                                                            <div className="text-[9px] opacity-80 line-clamp-1">{event.subject_name}</div>
                                                        </div>

                                                        {/* Section info */}
                                                        <div className="flex items-center justify-between my-0.5">
                                                            <span className="font-bold bg-white/40 px-1.5 py-0.5 rounded text-[9px] backdrop-blur-sm">
                                                                Sec {event.section_number}
                                                            </span>
                                                        </div>

                                                        {/* Details */}
                                                        <div className="mt-auto space-y-0.5">
                                                            <div className="flex items-center gap-1.5 opacity-90 text-[10px] truncate">
                                                                <LayoutGrid className="w-3 h-3 flex-shrink-0" />
                                                                <span className="truncate font-medium">{event.room || 'TBA'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 opacity-80 text-[10px] truncate">
                                                                <User className="w-3 h-3 flex-shrink-0" />
                                                                <span className="truncate">{event.lecturer_name || 'Staff'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons Overlay */}
                                                        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/80 dark:bg-black/40 p-1 rounded-lg backdrop-blur-md">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onSwap(event.registration_id); }}
                                                                className="p-1.5 bg-white hover:bg-blue-50 text-blue-600 rounded-md shadow-sm transition-transform hover:scale-110"
                                                                title="Swap Section"
                                                            >
                                                                <RefreshCw size={12} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onUnregister(event.registration_id); }}
                                                                className="p-1.5 bg-white hover:bg-red-50 text-red-600 rounded-md shadow-sm transition-transform hover:scale-110"
                                                                title="Drop Course"
                                                            >
                                                                <X size={12} />
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
            </div>
        </motion.div>
    );
};

export default TimetableSection;
