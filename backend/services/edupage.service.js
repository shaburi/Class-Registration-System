/**
 * aSc Edupage API Service
 * 
 * Handles fetching timetable data from Edupage API and storing it locally.
 * Data is only fetched when HOP manually triggers a sync to avoid rate limiting.
 * 
 * Set EDUPAGE_DEMO_MODE=true in .env to use mock data for testing.
 */

const axios = require('axios');
const xml2js = require('xml2js');
const { query } = require('../database/connection');
const edupageConfig = require('../config/edupage.config');
const logger = require('../utils/logger');

class EdupageService {
    constructor() {
        this.config = edupageConfig;
    }

    /**
     * Get mock data for demo/testing purposes
     * This simulates data from the Edupage API
     */
    getMockData() {
        return {
            baseData: {
                teachers: {
                    '1': { name: 'Dr. Ahmad bin Hassan', short: 'AH' },
                    '2': { name: 'Dr. Siti Nurhaliza', short: 'SN' },
                    '3': { name: 'Prof. Muhammad Rizal', short: 'MR' },
                    '4': { name: 'Dr. Farah Aisyah', short: 'FA' },
                    '5': { name: 'En. Hafiz Rahman', short: 'HR' }
                },
                subjects: {
                    '1': { name: 'Web Programming', short: 'CT206' },
                    '2': { name: 'Database Systems', short: 'CT204' },
                    '3': { name: 'Computer Fundamentals', short: 'CC101' },
                    '4': { name: 'Data Structures', short: 'CT203' },
                    '5': { name: 'Software Engineering', short: 'CT301' },
                    '6': { name: 'Network Security', short: 'CT305' }
                },
                classes: {
                    '1': { name: 'CDCS2501A', short: 'CS-A' },
                    '2': { name: 'CDCS2501B', short: 'CS-B' },
                    '3': { name: 'CDCS2502A', short: 'CS2-A' },
                    '4': { name: 'CDIS2501A', short: 'IS-A' }
                },
                classrooms: {
                    '1': { name: 'Computer Lab 1', short: 'CL1' },
                    '2': { name: 'Computer Lab 2', short: 'CL2' },
                    '3': { name: 'Lecture Hall A', short: 'LHA' },
                    '4': { name: 'Tutorial Room 101', short: 'TR101' }
                },
                periods: {
                    '1': { name: 'Period 1', short: 'P1', starttime: '08:00', endtime: '09:00' },
                    '2': { name: 'Period 2', short: 'P2', starttime: '09:00', endtime: '10:00' },
                    '3': { name: 'Period 3', short: 'P3', starttime: '10:00', endtime: '11:00' },
                    '4': { name: 'Period 4', short: 'P4', starttime: '11:00', endtime: '12:00' },
                    '5': { name: 'Period 5', short: 'P5', starttime: '14:00', endtime: '15:00' },
                    '6': { name: 'Period 6', short: 'P6', starttime: '15:00', endtime: '16:00' }
                },
                days: {
                    '1': { name: 'Monday', short: 'Mon' },
                    '2': { name: 'Tuesday', short: 'Tue' },
                    '3': { name: 'Wednesday', short: 'Wed' },
                    '4': { name: 'Thursday', short: 'Thu' },
                    '5': { name: 'Friday', short: 'Fri' }
                }
            },
            timetableData: {
                cards: {
                    '1': { subjectid: '1', teacherid: '1', classid: '1', classroomid: '1', period: '1', days: '10000' },
                    '2': { subjectid: '1', teacherid: '1', classid: '1', classroomid: '1', period: '2', days: '10000' },
                    '3': { subjectid: '2', teacherid: '2', classid: '1', classroomid: '2', period: '3', days: '10000' },
                    '4': { subjectid: '3', teacherid: '3', classid: '2', classroomid: '3', period: '1', days: '01000' },
                    '5': { subjectid: '2', teacherid: '2', classid: '2', classroomid: '2', period: '5', days: '01000' },
                    '6': { subjectid: '1', teacherid: '4', classid: '3', classroomid: '1', period: '1', days: '00100' },
                    '7': { subjectid: '3', teacherid: '3', classid: '4', classroomid: '4', period: '3', days: '00010' }
                }
            }
        };
    }

    /**
     * Fetch base data from Edupage API (teachers, subjects, classes, rooms)
     * Uses format=json as recommended by API documentation
     * @returns {Object} Parsed base data
     */
    async fetchBaseData() {
        // Use mock data in demo mode
        if (this.config.demoMode) {
            logger.info('Using DEMO MODE - returning mock base data');
            return this.getMockData().baseData;
        }

        if (!this.config.apiKey) {
            throw new Error('EDUPAGE_API_KEY is not configured');
        }

        // Use format=json as recommended by API docs
        const url = this.config.buildUrl(this.config.commands.getBaseData, { format: 'json' });

        try {
            logger.info(`Fetching base data from Edupage API: ${url.replace(this.config.apiKey, 'API_KEY_HIDDEN')}`);
            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'UPTM-Scheduling-System/1.0'
                }
            });

            // Check for error response (starts with 'Error' or 'WAIT')
            if (typeof response.data === 'string') {
                if (response.data.startsWith('Error')) {
                    throw new Error(response.data);
                }
                if (response.data.startsWith('WAIT')) {
                    throw new Error('Rate limited - please wait before retrying');
                }
            }

            logger.info('Edupage API response received', {
                status: response.status,
                hasData: !!response.data,
                apiStatus: response.data?.__eduapi_status
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to fetch base data from Edupage:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: url.replace(this.config.apiKey, 'API_KEY_HIDDEN')
            });
            throw new Error(`Edupage API error: ${error.message}`);
        }
    }

    /**
     * List available timetables from Edupage
     * API documentation says this returns JSON
     * @returns {Array} List of available timetables with timetableid, state, year, datefrom, dateto
     */
    async listTimetables() {
        if (!this.config.apiKey) {
            throw new Error('EDUPAGE_API_KEY is not configured');
        }

        const url = this.config.buildUrl(this.config.commands.listTimetables);

        try {
            logger.info(`Fetching timetable list from Edupage API: ${url.replace(this.config.apiKey, 'API_KEY_HIDDEN')}`);
            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json'
                }
            });

            // Check for error response
            if (typeof response.data === 'string') {
                if (response.data.startsWith('Error')) {
                    throw new Error(response.data);
                }
                if (response.data.startsWith('WAIT')) {
                    throw new Error('Rate limited - please wait before retrying');
                }
            }

            logger.info('listTimetables response:', JSON.stringify(response.data).substring(0, 500));

            // Response should be an array of timetables or object with timetables array
            if (Array.isArray(response.data)) {
                logger.info(`Found ${response.data.length} timetables`);
                return response.data;
            }

            // If it's an object, look for timetables array
            if (response.data?.timetables) {
                logger.info(`Found ${response.data.timetables.length} timetables`);
                return response.data.timetables;
            }

            return response.data;
        } catch (error) {
            logger.error('Failed to list timetables from Edupage:', error.message);
            throw new Error(`Edupage API error: ${error.message}`);
        }
    }

    /**
     * Fetch specific timetable data from Edupage
     * Uses timetableid (required) and format=json as per API documentation
     * @param {string} timetableId - The timetable ID from listtimetables
     * @returns {Object} Timetable data in TimetableJson format
     */
    async fetchTimetable(timetableId = null) {
        // Use mock data in demo mode
        if (this.config.demoMode) {
            logger.info('Using DEMO MODE - returning mock timetable data');
            return this.getMockData().timetableData;
        }

        if (!this.config.apiKey) {
            throw new Error('EDUPAGE_API_KEY is not configured');
        }

        // If timetableid not provided, first get list of timetables and use the most recent official one
        if (!timetableId) {
            logger.info('No timetableid specified, fetching timetable list first...');
            const timetables = await this.listTimetables();

            if (Array.isArray(timetables) && timetables.length > 0) {
                // Log all available timetables for debugging
                logger.info('Available timetables:', timetables.map(t => ({
                    id: t.timetableid || t.id,
                    state: t.state,
                    year: t.year,
                    datefrom: t.datefrom,
                    dateto: t.dateto
                })));

                // Find official timetables
                const officialTimetables = timetables.filter(t => t.state === 'official');
                logger.info(`Found ${officialTimetables.length} official timetables out of ${timetables.length} total`);

                // Sort by year (descending) then by datefrom (descending) to get the most recent
                const sortedOfficial = officialTimetables.sort((a, b) => {
                    const yearDiff = (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
                    if (yearDiff !== 0) return yearDiff;
                    // If same year, compare datefrom
                    return (b.datefrom || '').localeCompare(a.datefrom || '');
                });

                // Use the most recent official timetable, or the most recent of all if no official
                const selected = sortedOfficial.length > 0
                    ? sortedOfficial[0]  // Most recent official
                    : timetables[timetables.length - 1];

                timetableId = selected.timetableid || selected.id;
                logger.info(`Selected timetable: id=${timetableId}, state=${selected.state}, year=${selected.year}, datefrom=${selected.datefrom}`);
            } else {
                logger.warn('No timetables found from listtimetables');
                return { cards: { rows: [] } };
            }
        }

        // Build URL with timetableid (required), format=json, and idmode=edupage
        // idmode=edupage ensures IDs match with getbasedata response
        const params = {
            timetableid: timetableId,
            format: 'json',
            idmode: 'edupage'  // Use edupage IDs to match with getbasedata
        };

        const url = this.config.buildUrl(this.config.commands.getTimetable, params);

        try {
            logger.info(`Fetching timetable from Edupage API: ${url.replace(this.config.apiKey, 'API_KEY_HIDDEN')}`);
            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json'
                }
            });

            // Check for error response
            if (typeof response.data === 'string') {
                if (response.data.startsWith('Error')) {
                    logger.error('Edupage API returned error:', response.data);
                    return { cards: { rows: [] } };
                }
                if (response.data.startsWith('WAIT')) {
                    logger.warn('Rate limited by Edupage API');
                    return { cards: { rows: [] } };
                }
            }

            logger.info('Timetable data received', {
                hasSubjects: !!response.data?.subjects,
                hasCards: !!response.data?.cards,
                hasLessons: !!response.data?.lessons
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to fetch timetable from Edupage:', error.message);
            logger.warn('Returning empty timetable data due to error');
            return { cards: { rows: [] } };
        }
    }

    /**
     * Parse and extract relevant data from Edupage API responses (JSON format)
     * @param {Object} baseData - Response from getbasedata (format=json)
     * @param {Object} timetableData - Response from gettimetable (TimetableJson format)
     * @returns {Object} Parsed data structured for our database
     */
    parseEdupageData(baseData, timetableData) {
        const parsed = {
            teachers: [],
            subjects: [],
            classes: [],
            classrooms: [],
            lessons: [],
            cards: [],
            periods: [],
            days: []
        };

        // Helper to get rows from JSON response (handles both {rows:[]} and direct array)
        const getRows = (data) => {
            if (!data) return [];
            if (Array.isArray(data)) return data;
            if (data.rows && Array.isArray(data.rows)) return data.rows;
            return [];
        };

        // Parse from baseData (getbasedata response)
        // baseData has tables like teachers, subjects, classes, classrooms
        if (baseData?.teachers) {
            parsed.teachers = getRows(baseData.teachers).map(teacher => ({
                id: teacher.id || '',
                name: teacher.firstname && teacher.lastname
                    ? `${teacher.firstname} ${teacher.lastname}`
                    : (teacher.name || ''),
                short: teacher.short || '',
                color: teacher.color || null,
                gender: teacher.gender || null
            }));
        }

        if (baseData?.subjects) {
            parsed.subjects = getRows(baseData.subjects).map(subject => ({
                id: subject.id || '',
                name: subject.name || '',
                short: subject.short || '',
                color: subject.color || null
            }));
        }

        if (baseData?.classes) {
            parsed.classes = getRows(baseData.classes).map(cls => ({
                id: cls.id || '',
                name: cls.name || '',
                short: cls.short || '',
                classroomid: cls.classroomid || null
            }));
        }

        if (baseData?.classrooms) {
            parsed.classrooms = getRows(baseData.classrooms).map(room => ({
                id: room.id || '',
                name: room.name || '',
                short: room.short || '',
                buildingid: room.buildingid || null
            }));
        }

        // Parse from timetableData (gettimetable TimetableJson format)
        // TimetableJson has subjects, teachers, classes, classrooms, periods, days, lessons, cards
        // IMPORTANT: Use timetable data for subjects/teachers/classes because lessons reference these IDs

        // Always use timetable subjects since lessons reference them by timetable ID
        if (timetableData?.subjects) {
            const ttSubjects = getRows(timetableData.subjects);
            logger.info(`Timetable has ${ttSubjects.length} subjects`);
            if (ttSubjects.length > 0) {
                console.log('Sample timetable subject:', ttSubjects[0]);
                // Merge with baseData subjects - timetable subjects take precedence
                const subjectMap = new Map();
                // Add baseData subjects first
                parsed.subjects.forEach(s => subjectMap.set(s.id, s));
                // Override with timetable subjects
                ttSubjects.forEach(subject => {
                    subjectMap.set(subject.id, {
                        id: subject.id || '',
                        name: subject.name || '',
                        short: subject.short || ''
                    });
                });
                parsed.subjects = Array.from(subjectMap.values());
            }
        }

        if (timetableData?.teachers) {
            const ttTeachers = getRows(timetableData.teachers);
            if (ttTeachers.length > 0) {
                logger.info(`Timetable has ${ttTeachers.length} teachers`);
                const teacherMap = new Map();
                parsed.teachers.forEach(t => teacherMap.set(t.id, t));
                ttTeachers.forEach(teacher => {
                    teacherMap.set(teacher.id, {
                        id: teacher.id || '',
                        name: teacher.firstname && teacher.lastname
                            ? `${teacher.firstname} ${teacher.lastname}`
                            : (teacher.name || teacher.short || ''),
                        short: teacher.short || '',
                        color: teacher.color || null,
                        gender: teacher.gender || null
                    });
                });
                parsed.teachers = Array.from(teacherMap.values());
            }
        }

        if (timetableData?.classes) {
            const ttClasses = getRows(timetableData.classes);
            if (ttClasses.length > 0) {
                logger.info(`Timetable has ${ttClasses.length} classes`);
                const classMap = new Map();
                parsed.classes.forEach(c => classMap.set(c.id, c));
                ttClasses.forEach(cls => {
                    classMap.set(cls.id, {
                        id: cls.id || '',
                        name: cls.name || '',
                        short: cls.short || '',
                        classroomid: cls.classroomid || null
                    });
                });
                parsed.classes = Array.from(classMap.values());
            }
        }

        if (timetableData?.classrooms) {
            const ttRooms = getRows(timetableData.classrooms);
            if (ttRooms.length > 0) {
                logger.info(`Timetable has ${ttRooms.length} classrooms`);
                const roomMap = new Map();
                parsed.classrooms.forEach(r => roomMap.set(r.id, r));
                ttRooms.forEach(room => {
                    roomMap.set(room.id, {
                        id: room.id || '',
                        name: room.name || '',
                        short: room.short || '',
                        buildingid: room.buildingid || null
                    });
                });
                parsed.classrooms = Array.from(roomMap.values());
            }
        }

        // Parse periods from timetable
        if (timetableData?.periods) {
            parsed.periods = getRows(timetableData.periods).map(period => ({
                id: period.id || '',
                name: period.name || '',
                short: period.short || '',
                starttime: period.starttime || '',
                endtime: period.endtime || ''
            }));
        }

        // Parse days from timetable
        if (timetableData?.days) {
            parsed.days = getRows(timetableData.days).map(day => ({
                id: day.id || '',
                name: day.name || '',
                short: day.short || ''
            }));
        }

        // Parse lessons from timetable - these define subject-teacher-class relationships
        if (timetableData?.lessons) {
            const lessonRows = getRows(timetableData.lessons);
            logger.info(`Parsing ${lessonRows.length} lessons from timetable`);
            if (lessonRows.length > 0) {
                console.log('Sample lesson:', lessonRows[0]);
            }
            parsed.lessons = lessonRows.map(lesson => ({
                id: lesson.id || '',
                subjectid: lesson.subjectid || null,
                teacherids: lesson.teacherids || [],
                classids: lesson.classids || [],
                groupids: lesson.groupids || [],
                count: lesson.count || 0,
                durationperiods: lesson.durationperiods || 1
            }));
        }

        // Parse cards (scheduled instances) from timetable - these define when lessons happen
        if (timetableData?.cards) {
            const cardRows = getRows(timetableData.cards);
            logger.info(`Parsing ${cardRows.length} cards from timetable`);
            if (cardRows.length > 0) {
                console.log('Sample card:', cardRows[0]);
            }

            // Days bitmask: '1000000' = Monday, '0100000' = Tuesday, etc.
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            parsed.cards = cardRows.map(card => {
                // Parse days bitmask to get day index
                const daysBitmask = card.days || '';
                let dayIndex = -1;
                let dayName = '';
                for (let i = 0; i < daysBitmask.length; i++) {
                    if (daysBitmask[i] === '1') {
                        dayIndex = i;
                        dayName = dayNames[i] || `Day ${i + 1}`;
                        break;
                    }
                }

                return {
                    id: card.id || '',
                    lessonid: card.lessonid || null,
                    periodid: card.period || card.periodid || null, // API uses 'period' not 'periodid'
                    dayid: dayIndex >= 0 ? String(dayIndex) : null,
                    dayIndex: dayIndex,
                    dayName: dayName,
                    daysBitmask: daysBitmask,
                    weeks: card.weeks || '',
                    classroomids: card.classroomids || []
                };
            });
        }

        return parsed;
    }

    /**
     * Fetch from Edupage API and save to local database
     * This is the main method called when HOP clicks "Fetch Timetable"
     * @param {number} userId - ID of the user triggering the sync
     * @returns {Object} Result with synced data and metadata
     */
    async syncAndStore(userId) {
        const startTime = Date.now();
        let syncStatus = 'success';
        let errorMessage = null;
        let recordCount = 0;

        try {
            // Fetch base data (teachers, subjects, classes, rooms)
            logger.info('=== Starting Edupage Sync ===');
            const baseData = await this.fetchBaseData();
            logger.info('Base data received:', {
                hasTeachers: !!baseData?.teachers,
                hasSubjects: !!baseData?.subjects,
                hasClasses: !!baseData?.classes,
                hasClassrooms: !!baseData?.classrooms,
                sampleKeys: Object.keys(baseData || {}).slice(0, 10)
            });

            // Fetch timetable data
            const timetableData = await this.fetchTimetable();
            logger.info('Timetable data received:', {
                hasCards: !!timetableData?.cards,
                hasLessons: !!timetableData?.lessons,
                hasPeriods: !!timetableData?.periods,
                hasDays: !!timetableData?.days,
                sampleKeys: Object.keys(timetableData || {}).slice(0, 10)
            });

            // Parse the data
            const parsed = this.parseEdupageData(baseData, timetableData);
            logger.info('Parsed data:', {
                teachers: parsed.teachers.length,
                subjects: parsed.subjects.length,
                classes: parsed.classes.length,
                classrooms: parsed.classrooms.length,
                lessons: parsed.lessons.length,
                cards: parsed.cards.length,
                periods: parsed.periods.length,
                days: parsed.days.length
            });

            // Calculate total records
            recordCount =
                parsed.teachers.length +
                parsed.subjects.length +
                parsed.classes.length +
                parsed.classrooms.length +
                parsed.lessons.length +
                parsed.cards.length;

            // DELETE old data first, then insert new
            await query('DELETE FROM edupage_timetables');
            logger.info('Old timetable data deleted');

            // Store new data - lessons column contains both lessons and cards as structured object
            const lessonsData = {
                lessons: parsed.lessons,
                cards: parsed.cards
            };

            await query(`
                INSERT INTO edupage_timetables (
                    teachers, subjects, classes, classrooms, lessons, periods, days,
                    raw_basedata, raw_timetable, synced_at, synced_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
            `, [
                JSON.stringify(parsed.teachers),
                JSON.stringify(parsed.subjects),
                JSON.stringify(parsed.classes),
                JSON.stringify(parsed.classrooms),
                JSON.stringify(lessonsData), // Structured object with lessons and cards
                JSON.stringify(parsed.periods),
                JSON.stringify(parsed.days),
                JSON.stringify(baseData),
                JSON.stringify(timetableData),
                userId
            ]);

            logger.info(`Edupage sync completed. ${recordCount} records stored.`);
            logger.info('=== Edupage Sync Complete ===');

            // Return the parsed data with cards separate
            return {
                success: true,
                data: {
                    ...parsed,
                    cards: parsed.cards // Ensure cards are included
                },
                data: parsed,
                syncedAt: new Date().toISOString(),
                recordCount
            };

        } catch (error) {
            syncStatus = 'failed';
            errorMessage = error.message;
            logger.error('Edupage sync failed:', error);
            throw error;
        } finally {
            // Log the sync attempt
            const duration = Date.now() - startTime;
            await query(`
                INSERT INTO edupage_sync_log (sync_type, status, records_fetched, error_message, synced_by, duration_ms)
                VALUES ('full', $1, $2, $3, $4, $5)
            `, [syncStatus, recordCount, errorMessage, userId, duration]);
        }
    }

    /**
     * Get stored timetable data from local database
     * This is called on page load - NO API call
     * @returns {Object} Stored data with metadata
     */
    async getStoredData() {
        const result = await query(`
            SELECT 
                id,
                teachers,
                subjects,
                classes,
                classrooms,
                lessons,
                periods,
                days,
                synced_at,
                synced_by
            FROM edupage_timetables
            ORDER BY synced_at DESC
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return {
                success: true,
                data: null,
                syncedAt: null,
                isStale: true,
                message: 'No timetable data found. Click "Fetch Timetable" to sync from Edupage.'
            };
        }

        const row = result.rows[0];
        const syncedAt = new Date(row.synced_at);
        const daysSinceSync = Math.floor((Date.now() - syncedAt.getTime()) / (1000 * 60 * 60 * 24));
        const isStale = daysSinceSync >= this.config.staleDays;

        // Parse lessons data - may be structured {lessons, cards} or legacy array
        let lessons = [];
        let cards = [];
        if (row.lessons) {
            if (row.lessons.lessons && row.lessons.cards) {
                // New structured format
                lessons = row.lessons.lessons || [];
                cards = row.lessons.cards || [];
            } else if (Array.isArray(row.lessons)) {
                // Legacy array format - try to separate by presence of lessonid (cards) vs subjectid (lessons)
                lessons = row.lessons.filter(item => item.subjectid && !item.lessonid);
                cards = row.lessons.filter(item => item.lessonid);
            }
        }

        return {
            success: true,
            data: {
                teachers: row.teachers || [],
                subjects: row.subjects || [],
                classes: row.classes || [],
                classrooms: row.classrooms || [],
                lessons: lessons,
                cards: cards,
                periods: row.periods || [],
                days: row.days || []
            },
            syncedAt: row.synced_at,
            daysSinceSync,
            isStale,
            message: isStale
                ? `Data is ${daysSinceSync} days old. Consider refreshing.`
                : null
        };
    }

    /**
     * Get sync history/logs
     * @param {number} limit - Number of logs to retrieve
     * @returns {Array} Sync logs
     */
    async getSyncLogs(limit = 10) {
        const result = await query(`
            SELECT 
                sl.id,
                sl.sync_type,
                sl.status,
                sl.records_fetched,
                sl.error_message,
                sl.synced_at,
                sl.duration_ms,
                u.email as synced_by_email
            FROM edupage_sync_log sl
            LEFT JOIN users u ON sl.synced_by = u.id
            ORDER BY sl.synced_at DESC
            LIMIT $1
        `, [limit]);

        return result.rows;
    }

    /**
     * Import sections from Edupage timetable data
     * Creates sections in the system based on timetable lessons/cards
     * 
     * @param {Array} targetPrefixes - Class prefixes to import (e.g., ['CT206', 'CT204', 'CC101'])
     * @returns {Object} Import results
     */
    async importSectionsFromTimetable(targetPrefixes = ['CT206', 'CT204', 'CC101']) {
        logger.info(`Starting section import for prefixes: ${targetPrefixes.join(', ')}`);

        // Get stored Edupage data
        const storedData = await this.getStoredData();
        if (!storedData.success || !storedData.data) {
            throw new Error('No Edupage data available. Please sync first.');
        }

        const { subjects, teachers, classes, classrooms, lessons, cards, periods } = storedData.data;

        // Day mapping from index to day_of_week enum
        const dayMapping = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // Build lookup maps
        const subjectById = {};
        subjects.forEach(s => { subjectById[s.id] = s; });

        const teacherById = {};
        teachers.forEach(t => { teacherById[t.id] = t; });

        const classroomById = {};
        classrooms.forEach(r => { classroomById[r.id] = r; });

        const periodById = {};
        periods.forEach(p => { periodById[p.id] = p; });

        // Filter classes by target prefixes
        const targetClasses = classes.filter(c =>
            targetPrefixes.some(prefix =>
                c.short?.toUpperCase().startsWith(prefix) ||
                c.name?.toUpperCase().startsWith(prefix)
            )
        );

        logger.info(`Found ${targetClasses.length} classes matching prefixes`);

        const sectionsToImport = [];
        const errors = [];
        const skipped = [];

        // Process each target class
        for (const cls of targetClasses) {
            // Find lessons for this class
            const classLessons = lessons.filter(l => l.classids?.includes(cls.id));

            for (const lesson of classLessons) {
                const subject = subjectById[lesson.subjectid];
                if (!subject) {
                    skipped.push({ reason: 'No subject found', lessonId: lesson.id });
                    continue;
                }

                // Parse subject code and section from subject.short (e.g., "STA2133_02")
                const subjectShort = subject.short || '';
                const parts = subjectShort.split('_');
                const subjectCode = parts[0] || subjectShort;
                const sectionNumber = parts[1] || '01';

                // Skip if subject code is too short or looks invalid
                if (subjectCode.length < 4) {
                    skipped.push({ reason: 'Invalid subject code', subjectShort });
                    continue;
                }

                // Get teacher info
                const teacherIds = lesson.teacherids || [];
                const teacherNames = teacherIds
                    .map(tid => teacherById[tid])
                    .filter(Boolean)
                    .map(t => t.name || t.short);

                // Find cards (scheduled instances) for this lesson
                const lessonCards = cards.filter(c => c.lessonid === lesson.id);

                if (lessonCards.length === 0) {
                    skipped.push({ reason: 'No schedule (cards) found', lessonId: lesson.id, subjectShort });
                    continue;
                }

                // Process each card (a lesson can have multiple schedule slots)
                for (const card of lessonCards) {
                    const dayIndex = card.dayIndex;
                    const day = dayIndex >= 0 && dayIndex < 7 ? dayMapping[dayIndex] : null;

                    if (!day) {
                        skipped.push({ reason: 'Invalid day', cardId: card.id });
                        continue;
                    }

                    // Get period info for time
                    const period = periodById[card.periodid];
                    const startTime = period?.starttime || '08:00';
                    const duration = lesson.durationperiods || 1;

                    // Calculate end time based on duration
                    let endTime = period?.endtime || '09:00';
                    if (duration > 1 && period) {
                        // Find the end period
                        const periodIndex = periods.findIndex(p => p.id === period.id);
                        const endPeriod = periods[periodIndex + duration - 1];
                        if (endPeriod) {
                            endTime = endPeriod.endtime || endTime;
                        }
                    }

                    // Get room info
                    const roomIds = card.classroomids?.filter(rid => rid && rid.trim() !== '') || [];
                    const rooms = roomIds.map(rid => classroomById[rid]).filter(Boolean);
                    const roomName = rooms.length > 0 ? rooms[0].short || rooms[0].name : null;

                    sectionsToImport.push({
                        subject_code: subjectCode,
                        subject_name: subject.name || subjectShort,
                        section_number: sectionNumber,
                        day: day,
                        start_time: startTime,
                        end_time: endTime,
                        room: roomName,
                        lecturer_names: teacherNames,
                        class_name: cls.short || cls.name,
                        edupage_lesson_id: lesson.id,
                        edupage_card_id: card.id
                    });
                }
            }
        }

        logger.info(`Prepared ${sectionsToImport.length} sections for import, ${skipped.length} skipped`);

        // Subjects to ignore (non-academic)
        const ignoredSubjects = ['HUFFAZ', 'MENTOR', 'MENTOR_MENTEE', 'MENTEE', 'COCURRICULAR', 'KOKURIKULUM'];

        // Filter out ignored subjects
        const filteredSections = sectionsToImport.filter(section => {
            const code = section.subject_code.toUpperCase();
            return !ignoredSubjects.some(ignored => code.includes(ignored));
        });

        logger.info(`After filtering ignored subjects: ${filteredSections.length} sections to process`);

        // First pass: Check which subjects are missing from database
        // For combined codes like "UCS3083/UCS3103", try to find ANY matching code
        const missingSubjects = [];
        const subjectCache = {}; // cache subject_code -> subject_id
        const missingSubjectCodes = new Set();

        // Collect all unique subject codes that need to be checked
        const uniqueSubjectCodes = [...new Set(filteredSections.map(s => s.subject_code))];

        for (const subjectCode of uniqueSubjectCodes) {
            // Handle combined codes like "UCS3083/UCS3103" - split and try each
            const codesToTry = subjectCode.split('/').map(c => c.trim());
            let foundSubjectId = null;
            let matchedCode = null;

            for (const code of codesToTry) {
                if (!code || code.length < 4) continue;

                const existingSubject = await query(
                    'SELECT id, code FROM subjects WHERE code = $1',
                    [code]
                );

                if (existingSubject.rows.length > 0) {
                    foundSubjectId = existingSubject.rows[0].id;
                    matchedCode = existingSubject.rows[0].code;
                    break; // Found a match, use this one
                }
            }

            if (foundSubjectId) {
                subjectCache[subjectCode] = { id: foundSubjectId, matchedCode };
                logger.info(`Matched "${subjectCode}" to existing subject "${matchedCode}"`);
            } else {
                missingSubjectCodes.add(subjectCode);
            }
        }

        // Build missing subjects list with details (excluding ignored ones)
        if (missingSubjectCodes.size > 0) {
            for (const section of filteredSections) {
                if (missingSubjectCodes.has(section.subject_code) &&
                    !missingSubjects.find(m => m.code === section.subject_code)) {

                    // Skip if it's an ignored subject
                    const code = section.subject_code.toUpperCase();
                    if (ignoredSubjects.some(ignored => code.includes(ignored))) {
                        continue;
                    }
                    // Extract semester from class name (e.g., CT206_1.1 -> semester 1)
                    const semesterMatch = section.class_name.match(/_(\d)/);
                    const semester = semesterMatch ? parseInt(semesterMatch[1]) : 1;

                    // Extract programme from class name (e.g., CT206_1.1 -> CT206)
                    // Try multiple patterns to match the programme code
                    let programme = 'UNKNOWN';
                    const className = section.class_name || '';

                    // Pattern 1: Extract leading programme code (e.g., CT206, CC101)
                    const programmeMatch = className.match(/^([A-Z]{2,}\d{3})/i);
                    if (programmeMatch) {
                        programme = programmeMatch[1].toUpperCase();
                    } else {
                        // Pattern 2: Use the target prefix that we're importing for
                        // Get from the first section that matches this subject
                        for (const prefix of targetPrefixes) {
                            if (className.toUpperCase().includes(prefix)) {
                                programme = prefix;
                                break;
                            }
                        }
                    }

                    logger.info(`Missing subject ${section.subject_code}: class_name="${className}", programme="${programme}"`);

                    missingSubjects.push({
                        code: section.subject_code,
                        name: section.subject_name,
                        credit_hours: 3,
                        semester: semester,
                        programme: programme,
                        class_name: section.class_name
                    });
                }
            }

            // If there are missing subjects, return early with the list
            // User needs to add these subjects first before re-importing
            logger.info(`Found ${missingSubjects.length} missing subjects that need to be added first`);
            return {
                success: false,
                hasMissingSubjects: true,
                missingSubjects,
                summary: {
                    total_processed: 0,
                    imported: 0,
                    created: 0,
                    updated: 0,
                    errors: 0,
                    skipped: skipped.length,
                    missing_subjects: missingSubjects.length
                },
                message: `Found ${missingSubjects.length} subjects that don't exist in the database. Please add them first.`,
                skipped: skipped.slice(0, 20)
            };
        }

        // Now insert into database - all subjects exist
        const imported = [];

        for (const section of filteredSections) {
            try {
                // Get subject ID from cache (we know it exists)
                const cachedSubject = subjectCache[section.subject_code];
                if (!cachedSubject) {
                    skipped.push({ reason: 'Subject not in cache', code: section.subject_code });
                    continue;
                }
                const subjectId = cachedSubject.id;

                // Check if this section already exists (by subject + section_number only)
                let sectionId;
                const existingSection = await query(
                    `SELECT id FROM sections 
                     WHERE subject_id = $1 AND section_number = $2`,
                    [subjectId, section.section_number]
                );

                if (existingSection.rows.length > 0) {
                    sectionId = existingSection.rows[0].id;
                } else {
                    // Create the section (without schedule - that goes in section_schedules)
                    const newSection = await query(
                        `INSERT INTO sections (subject_id, section_number, capacity, day, start_time, end_time, room)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         RETURNING id`,
                        [subjectId, section.section_number, 40, section.day, section.start_time, section.end_time, section.room]
                    );
                    sectionId = newSection.rows[0].id;
                    imported.push({ ...section, action: 'created', id: sectionId });
                }

                // Ensure programme_section_links exist for this section
                // Link to the programme extracted from the class name (e.g., CT206_1.1 → CT206)
                const classProgMatch = (section.class_name || '').match(/^([A-Z]{2,}\d{3})/i);
                const classProgramme = classProgMatch ? classProgMatch[1].toUpperCase() : null;

                // Also link to all programmes that have this subject (by ID, code, or structure)
                const linkedProgs = await query(`
                    SELECT DISTINCT prog FROM (
                        SELECT sub.programme AS prog FROM subjects sub WHERE sub.id = $1
                        UNION
                        SELECT sub2.programme AS prog FROM subjects sub2
                        WHERE sub2.code = (SELECT code FROM subjects WHERE id = $1)
                        UNION
                        SELECT ps.programme AS prog FROM program_structure_courses psc
                        JOIN program_structures ps ON psc.structure_id = ps.id
                        WHERE psc.subject_id = $1
                    ) all_progs
                `, [subjectId]);

                const allProgs = new Set(linkedProgs.rows.map(r => r.prog));
                if (classProgramme) allProgs.add(classProgramme);

                for (const prog of allProgs) {
                    await query(`
                        INSERT INTO programme_section_links (programme, section_id)
                        VALUES ($1, $2)
                        ON CONFLICT (programme, section_id) DO NOTHING
                    `, [prog, sectionId]);
                }

                // Now add/update the schedule in section_schedules table
                // Check if this specific schedule already exists
                const existingSchedule = await query(
                    `SELECT id FROM section_schedules 
                     WHERE section_id = $1 AND day = $2 AND start_time = $3`,
                    [sectionId, section.day, section.start_time]
                );

                if (existingSchedule.rows.length > 0) {
                    // Update existing schedule
                    await query(
                        `UPDATE section_schedules 
                         SET end_time = $1, room = $2
                         WHERE id = $3`,
                        [section.end_time, section.room, existingSchedule.rows[0].id]
                    );
                    if (!imported.find(i => i.id === sectionId)) {
                        imported.push({ ...section, action: 'updated', id: sectionId });
                    }
                } else {
                    // Insert new schedule for this section
                    await query(
                        `INSERT INTO section_schedules (section_id, day, start_time, end_time, room)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [sectionId, section.day, section.start_time, section.end_time, section.room]
                    );
                    if (!imported.find(i => i.id === sectionId)) {
                        imported.push({ ...section, action: 'schedule_added', id: sectionId });
                    }
                }
            } catch (err) {
                errors.push({ section, error: err.message });
                logger.error(`Failed to import section: ${err.message}`, { section });
            }
        }

        const result = {
            success: true,
            summary: {
                total_processed: filteredSections.length,
                imported: imported.length,
                created: imported.filter(s => s.action === 'created').length,
                updated: imported.filter(s => s.action === 'updated' || s.action === 'schedule_added').length,
                errors: errors.length,
                skipped: skipped.length,
                ignored: sectionsToImport.length - filteredSections.length
            },
            imported,
            errors,
            skipped: skipped.slice(0, 20) // Limit skipped for response size
        };

        logger.info(`Section import complete: ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.errors} errors, ${result.summary.ignored} ignored`);

        return result;
    }
}

module.exports = new EdupageService();
