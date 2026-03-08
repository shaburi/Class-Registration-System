import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import getSubjectColor from '../../utils/getSubjectColor';

export default function TimetableTab({ sections, subjects }) {
    const [selectedSemester, setSelectedSemester] = useState('all');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Time range: 8:00 AM to 10:00 PM
    const startHour = 8;
    const endHour = 22; // 10 PM
    const timeSlots = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    // Get unique semesters from subjects
    const availableSemesters = useMemo(() =>
        [...new Set(subjects?.map(s => s.semester).filter(Boolean))].sort((a, b) => a - b),
        [subjects]
    );

    // Filter sections by selected semester
    const filteredSections = useMemo(() => selectedSemester === 'all'
        ? sections
        : sections.filter(s => s.semester === parseInt(selectedSemester)),
        [sections, selectedSemester]
    );

    const formatTime = (hour) => {
        const h = hour % 12 || 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        return `${h} ${ampm}`;
    };

    // Helper to process sections for a day and assign vertical positions
    const getProcessedDaySections = (day) => {
        const daySections = filteredSections
            .filter(s => s.day.toLowerCase() === day.toLowerCase())
            .map(s => {
                const startH = parseInt(s.start_time.split(':')[0]);
                const startM = parseInt(s.start_time.split(':')[1]);
                const endH = parseInt(s.end_time.split(':')[0]);
                const endM = parseInt(s.end_time.split(':')[1]);

                // Convert to minutes from 8:00 AM
                const startMinutes = (startH - startHour) * 60 + startM;
                const durationMinutes = ((endH - startH) * 60) + (endM - startM);

                return {
                    ...s,
                    startMinutes,
                    endMinutes: startMinutes + durationMinutes,
                    durationMinutes
                };
            })
            .sort((a, b) => a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes);

        // Assign vertical levels
        const levels = []; // Array of end times for each level
        const positionedSections = daySections.map(section => {
            let level = 0;
            // Find the first level where this section fits
            while (true) {
                if (!levels[level] || levels[level] <= section.startMinutes) {
                    levels[level] = section.endMinutes;
                    break;
                }
                level++;
            }
            return { ...section, level };
        });

        // Calculate total height needed
        const totalLevels = levels.length > 0 ? levels.length : 1;
        const trackHeight = 85;
        const rowHeight = Math.max(trackHeight, totalLevels * trackHeight);

        return { sections: positionedSections, rowHeight, trackHeight };
    };

    return (
        <div className="pb-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
            <div className="min-w-[800px]">
                {/* Header with Semester Selector */}
                <div className="flex justify-between items-center p-6 pb-4 sticky left-0 z-30 bg-white dark:bg-gray-800">
                    <div>
                        <h3 className="font-bold text-xl text-gray-800 dark:text-white">Global Timetable</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {filteredSections.length} sections {selectedSemester !== 'all' ? `in Semester ${selectedSemester}` : 'across all semesters'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Semester:</label>
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <option value="all">All Semesters</option>
                            {availableSemesters.map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full select-none">
                    {/* Header Row */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                        <div className="w-24 flex-shrink-0 p-2 border-r border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-0 z-20 bg-gray-100 dark:bg-gray-700">
                            Day
                        </div>
                        <div className="flex-1 flex relative">
                            {timeSlots.map(hour => (
                                <div key={hour} className="flex-1 p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-100/50 dark:border-gray-700/50 last:border-r-0">
                                    {formatTime(hour)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Day Rows */}
                    {days.map((day, dayIndex) => {
                        const { sections: daySections, rowHeight, trackHeight } = getProcessedDaySections(day);

                        return (
                            <div
                                key={day}
                                className="flex border-b border-gray-200 dark:border-gray-700 relative group"
                                style={{ height: `${rowHeight}px` }}
                            >
                                {/* Day Label */}
                                <div className={`w-24 flex-shrink-0 flex items-center justify-center p-4 font-bold text-lg text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700 uppercase tracking-widest sticky left-0 z-10 ${dayIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                    {day.substring(0, 3)}
                                </div>

                                {/* Timeline Area */}
                                <div className="flex-1 relative">
                                    {/* Grid Lines (Background) */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {timeSlots.map((_, i) => (
                                            <div key={i} className="flex-1 border-r border-gray-100 dark:border-gray-800/50 last:border-r-0" />
                                        ))}
                                    </div>

                                    {/* Sections Blocks */}
                                    {daySections.map(section => {
                                        const totalMinutes = (endHour - startHour + 1) * 60;
                                        const leftPercent = (section.startMinutes / totalMinutes) * 100;
                                        const widthPercent = (section.durationMinutes / totalMinutes) * 100;
                                        const topPos = section.level * trackHeight;
                                        const colorClass = getSubjectColor(section.subject_code);

                                        return (
                                            <motion.div
                                                key={section.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                whileHover={{ scale: 1.05, zIndex: 50 }}
                                                className="absolute p-0.5 transition-all duration-200 group/card"
                                                title={`${section.subject_code} - ${section.subject_name} (${section.room}) | Sem ${section.semester}`}
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
                                                    <div className="flex justify-between items-start gap-1">
                                                        <div className="font-bold text-[11px] leading-tight mb-1 break-words whitespace-normal" title={section.subject_name}>

                                                            {section.subject_code}
                                                        </div>
                                                        <span className="text-[9px] uppercase font-bold px-1 rounded bg-black/10 dark:bg-white/20 whitespace-nowrap">
                                                            {section.section_number}
                                                        </span>
                                                    </div>

                                                    <div className="mt-auto">
                                                        <div className="flex items-center gap-1 opacity-90 text-[10px] truncate">
                                                            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                                            <span className="truncate">{section.room || 'TBA'}</span>
                                                        </div>
                                                        {selectedSemester === 'all' && (
                                                            <div className="flex items-center gap-1 opacity-80 text-[10px] truncate">
                                                                <span className="truncate font-medium">Sem {section.semester}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty State */}
                    {filteredSections.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No sections found for Semester {selectedSemester}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
