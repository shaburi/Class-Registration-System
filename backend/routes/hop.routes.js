const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { permissions } = require('../middleware/rbac');
const { query } = require('../database/connection');
const hopService = require('../services/hop.service');
const manualJoinService = require('../services/manualJoin.service');
const swapService = require('../services/swap.service');
const schedulingService = require('../services/scheduling.service');
const edupageService = require('../services/edupage.service');
const subjectImportService = require('../services/subjectImport.service');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/pdf'
        ];
        const allowedExtensions = ['.csv', '.xls', '.xlsx', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: CSV, XLS, XLSX, PDF`));
        }
    }
});

// All HOP routes require authentication and HOP role
router.use(authenticate);
router.use(permissions.canManageSubjects);

// ============================================================================
// SECTION BULK OPERATIONS
// ============================================================================

/**
 * DELETE /api/hop/sections/all
 * Delete all sections (clears timetable)
 */
router.delete('/sections/all', async (req, res) => {
    try {
        const result = await hopService.deleteAllSections();
        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} sections`,
            data: result
        });
    } catch (error) {
        console.error('Delete all sections error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete sections',
            message: error.message
        });
    }
});

/**
 * DELETE /api/hop/subjects/all
 * Delete all subjects (also deletes all sections and registrations)
 */
router.delete('/subjects/all', async (req, res) => {
    try {
        const result = await hopService.deleteAllSubjects();
        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} subjects`,
            data: result
        });
    } catch (error) {
        console.error('Delete all subjects error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete subjects',
            message: error.message
        });
    }
});

// ============================================================================
// ANALYTICS & STATISTICS
// ============================================================================

/**
 * GET /api/hop/analytics
 * Get comprehensive analytics data for dashboard visualizations
 */
router.get('/analytics', async (req, res) => {
    try {
        const { query } = require('../database/connection');

        // Get enrollment trend (last 7 days)
        const enrollmentTrendResult = await query(`
            SELECT 
                DATE(registered_at) as date,
                COUNT(*) as count
            FROM registrations
            WHERE registered_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(registered_at)
            ORDER BY date ASC
        `);

        // Get subject popularity
        const subjectPopularityResult = await query(`
            SELECT 
                s.code,
                s.name,
                COUNT(r.id) as students
            FROM subjects s
            LEFT JOIN sections sec ON s.id = sec.subject_id
            LEFT JOIN registrations r ON sec.id = r.section_id
            GROUP BY s.id, s.code, s.name
            ORDER BY students DESC
            LIMIT 10
        `);

        // Get overall capacity utilization
        const utilizationResult = await query(`
            SELECT 
                COALESCE(SUM(capacity), 0) as total_capacity,
                COALESCE(SUM(enrolled_count), 0) as current_enrollment
            FROM sections
        `);

        // Get section stats (full vs available)
        const sectionStatsResult = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN enrolled_count >= capacity THEN 1 END) as full_sections,
                COUNT(CASE WHEN enrolled_count < capacity THEN 1 END) as available_sections
            FROM sections
        `);

        // Get registration activity by day of week
        const dayActivityResult = await query(`
            SELECT 
                EXTRACT(DOW FROM registered_at) as day_of_week,
                COUNT(*) as count
            FROM registrations
            WHERE registered_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY EXTRACT(DOW FROM registered_at)
            ORDER BY day_of_week
        `);

        // Get section utilization breakdown
        const utilizationBreakdownResult = await query(`
            SELECT 
                CASE 
                    WHEN (enrolled_count::float / NULLIF(capacity, 0) * 100) >= 90 THEN 'full'
                    WHEN (enrolled_count::float / NULLIF(capacity, 0) * 100) >= 50 THEN 'moderate'
                    ELSE 'low'
                END as category,
                COUNT(*) as count
            FROM sections
            GROUP BY category
        `);

        const utilization = utilizationResult.rows[0];
        const utilizationPercent = utilization.total_capacity > 0
            ? Math.round((utilization.current_enrollment / utilization.total_capacity) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                enrollmentTrend: enrollmentTrendResult.rows.map(r => ({
                    date: r.date,
                    count: parseInt(r.count)
                })),
                subjectPopularity: subjectPopularityResult.rows.map(r => ({
                    code: r.code,
                    name: r.name,
                    students: parseInt(r.students)
                })),
                utilizationStats: {
                    totalCapacity: parseInt(utilization.total_capacity),
                    currentEnrollment: parseInt(utilization.current_enrollment),
                    utilization: utilizationPercent
                },
                sectionStats: {
                    total: parseInt(sectionStatsResult.rows[0]?.total || 0),
                    full: parseInt(sectionStatsResult.rows[0]?.full_sections || 0),
                    available: parseInt(sectionStatsResult.rows[0]?.available_sections || 0)
                },
                dayActivity: dayActivityResult.rows.map(r => ({
                    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(r.day_of_week)],
                    count: parseInt(r.count)
                })),
                utilizationBreakdown: utilizationBreakdownResult.rows.map(r => ({
                    category: r.category,
                    count: parseInt(r.count)
                }))
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/hop/schedule-heatmap
 * Get schedule density data for heatmap visualization
 */
router.get('/schedule-heatmap', async (req, res) => {
    try {
        const result = await query(`
            SELECT day, start_time, COUNT(*) as section_count
            FROM sections
            WHERE is_active = true
            GROUP BY day, start_time
            ORDER BY day, start_time
        `);

        // Convert to heatmap format
        const heatmap = {};
        let maxCount = 1;

        // Capitalize day names to match frontend (e.g., "monday" -> "Monday")
        const capitalizeDay = (day) => {
            if (!day) return '';
            return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
        };

        result.rows.forEach(row => {
            const hour = parseInt(row.start_time.split(':')[0]);
            const day = capitalizeDay(row.day);
            const key = `${day}-${hour}`;
            const count = parseInt(row.section_count);
            heatmap[key] = count;
            if (count > maxCount) maxCount = count;
        });

        res.json({
            success: true,
            data: { heatmap, maxCount }
        });
    } catch (error) {
        console.error('Heatmap error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/hop/students
 * Get all students for the student logs sidebar
 */
router.get('/students', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id,
                student_id,
                student_name,
                email,
                programme,
                semester,
                created_at
            FROM users
            WHERE role = 'student' AND is_active = true
            ORDER BY student_name ASC
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('[STUDENTS] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/hop/activity-log
 * Get recent registration activity for timeline
 */
router.get('/activity-log', async (req, res) => {
    try {
        // Get recent registrations
        const registrations = await query(`
            SELECT 
                r.id,
                'registration' as type,
                u.student_name,
                sub.code as subject_code,
                sec.section_number,
                r.registered_at as created_at
            FROM registrations r
            JOIN users u ON r.student_id = u.id
            JOIN sections sec ON r.section_id = sec.id
            JOIN subjects sub ON sec.subject_id = sub.id
            ORDER BY r.registered_at DESC
            LIMIT 20
        `);

        // Get recent drop requests
        const drops = await query(`
            SELECT 
                dr.id,
                'drop' as type,
                u.student_name,
                sub.code as subject_code,
                sec.section_number,
                dr.created_at as created_at
            FROM drop_requests dr
            JOIN registrations r ON dr.registration_id = r.id
            JOIN users u ON dr.student_id = u.id
            JOIN sections sec ON r.section_id = sec.id
            JOIN subjects sub ON sec.subject_id = sub.id
            WHERE dr.status = 'approved'
            ORDER BY dr.created_at DESC
            LIMIT 10
        `);

        // Combine and sort by date
        const activities = [...registrations.rows, ...drops.rows]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 15);

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Activity log error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// STUDENT LOGS (Comprehensive Activity Tracking)
// ============================================================================

/**
 * GET /api/hop/student-logs
 * Get comprehensive student activity logs with filtering
 * Query params: student_search, action_type, start_date, end_date, limit, page
 */
router.get('/student-logs', async (req, res) => {
    try {
        const {
            student_search,
            action_type,
            start_date,
            end_date,
            limit = 50,
            page = 1
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const logs = [];

        // Build base WHERE clauses
        let studentFilter = '';
        const filterParams = [];
        let paramCount = 1;

        if (student_search) {
            studentFilter = ` AND (LOWER(u.student_name) LIKE LOWER($${paramCount}) OR LOWER(u.student_id) LIKE LOWER($${paramCount}))`;
            filterParams.push(`%${student_search}%`);
            paramCount++;
        }

        let dateFilter = '';
        if (start_date) {
            dateFilter += ` AND r.registered_at >= $${paramCount}`;
            filterParams.push(start_date);
            paramCount++;
        }
        if (end_date) {
            dateFilter += ` AND r.registered_at <= $${paramCount}`;
            filterParams.push(end_date);
            paramCount++;
        }

        // Get registrations if action_type is 'all' or 'registration'
        if (!action_type || action_type === 'all' || action_type === 'registration') {
            const registrationQuery = `
                SELECT 
                    r.id,
                    'registration' as action_type,
                    u.id as user_id,
                    u.student_id as student_number,
                    u.student_name,
                    u.email as student_email,
                    u.programme as student_programme,
                    sub.code as subject_code,
                    sub.name as subject_name,
                    sec.section_number,
                    sec.day,
                    sec.start_time,
                    sec.end_time,
                    sec.room,
                    r.registration_type,
                    r.registered_at as created_at,
                    NULL as status,
                    NULL as reason
                FROM registrations r
                JOIN users u ON r.student_id = u.id
                JOIN sections sec ON r.section_id = sec.id
                JOIN subjects sub ON sec.subject_id = sub.id
                WHERE 1=1 ${studentFilter} ${dateFilter}
                ORDER BY r.registered_at DESC
            `;
            const registrations = await query(registrationQuery, filterParams);
            logs.push(...registrations.rows);
        }

        // Get drops if action_type is 'all' or 'drop'
        if (!action_type || action_type === 'all' || action_type === 'drop') {
            // Reset param count for drop query
            let dropParams = [];
            let dropParamCount = 1;
            let dropStudentFilter = '';
            let dropDateFilter = '';

            if (student_search) {
                dropStudentFilter = ` AND (LOWER(u.student_name) LIKE LOWER($${dropParamCount}) OR LOWER(u.student_id) LIKE LOWER($${dropParamCount}))`;
                dropParams.push(`%${student_search}%`);
                dropParamCount++;
            }
            if (start_date) {
                dropDateFilter += ` AND dr.created_at >= $${dropParamCount}`;
                dropParams.push(start_date);
                dropParamCount++;
            }
            if (end_date) {
                dropDateFilter += ` AND dr.created_at <= $${dropParamCount}`;
                dropParams.push(end_date);
                dropParamCount++;
            }

            const dropQuery = `
                SELECT 
                    dr.id,
                    'drop' as action_type,
                    u.id as user_id,
                    u.student_id as student_number,
                    u.student_name,
                    u.email as student_email,
                    u.programme as student_programme,
                    sub.code as subject_code,
                    sub.name as subject_name,
                    sec.section_number,
                    COALESCE(ss.day, sec.day) as day,
                    COALESCE(ss.start_time, sec.start_time) as start_time,
                    COALESCE(ss.end_time, sec.end_time) as end_time,
                    COALESCE(ss.room, sec.room) as room,
                    NULL as registration_type,
                    dr.created_at,
                    dr.status,
                    dr.reason
                FROM drop_requests dr
                JOIN users u ON dr.student_id = u.id
                JOIN sections sec ON dr.section_id = sec.id
                JOIN subjects sub ON sec.subject_id = sub.id
                LEFT JOIN LATERAL (
                    SELECT day, start_time, end_time, room 
                    FROM section_schedules 
                    WHERE section_id = sec.id 
                    ORDER BY day, start_time 
                    LIMIT 1
                ) ss ON true
                WHERE 1=1 ${dropStudentFilter} ${dropDateFilter}
                ORDER BY dr.created_at DESC
            `;
            const drops = await query(dropQuery, dropParams);
            logs.push(...drops.rows);
        }

        // Get swaps if action_type is 'all' or 'swap'
        if (!action_type || action_type === 'all' || action_type === 'swap') {
            let swapParams = [];
            let swapParamCount = 1;
            let swapStudentFilter1 = '';
            let swapDateFilter1 = '';

            // Build filters for first part of UNION
            if (student_search) {
                swapStudentFilter1 = ` AND (LOWER(u.student_name) LIKE LOWER($${swapParamCount}) OR LOWER(u.student_id) LIKE LOWER($${swapParamCount}))`;
                swapParams.push(`%${student_search}%`);
                swapParamCount++;
            }
            if (start_date) {
                swapDateFilter1 += ` AND sr.created_at >= $${swapParamCount}`;
                swapParams.push(start_date);
                swapParamCount++;
            }
            if (end_date) {
                swapDateFilter1 += ` AND sr.created_at <= $${swapParamCount}`;
                swapParams.push(end_date);
                swapParamCount++;
            }

            // Build filters for second part of UNION with offset param indices
            let swapStudentFilter2 = '';
            let swapDateFilter2 = '';

            if (student_search) {
                swapStudentFilter2 = ` AND (LOWER(u.student_name) LIKE LOWER($${swapParamCount}) OR LOWER(u.student_id) LIKE LOWER($${swapParamCount}))`;
                swapParams.push(`%${student_search}%`);
                swapParamCount++;
            }
            if (start_date) {
                swapDateFilter2 += ` AND sr.created_at >= $${swapParamCount}`;
                swapParams.push(start_date);
                swapParamCount++;
            }
            if (end_date) {
                swapDateFilter2 += ` AND sr.created_at <= $${swapParamCount}`;
                swapParams.push(end_date);
                swapParamCount++;
            }

            // Use UNION to get swap logs for BOTH requester and target students
            const swapQuery = `
                SELECT 
                    sr.id,
                    'swap' as action_type,
                    u.id as user_id,
                    u.student_id as student_number,
                    u.student_name,
                    u.email as student_email,
                    u.programme as student_programme,
                    sub.code as subject_code,
                    sub.name as subject_name,
                    sec.section_number,
                    COALESCE(ss.day, sec.day) as day,
                    COALESCE(ss.start_time, sec.start_time) as start_time,
                    COALESCE(ss.end_time, sec.end_time) as end_time,
                    COALESCE(ss.room, sec.room) as room,
                    'requester' as swap_role,
                    sr.created_at,
                    sr.status,
                    sr.response_reason as reason
                FROM swap_requests sr
                JOIN users u ON sr.requester_id = u.id
                JOIN sections sec ON sr.requester_section_id = sec.id
                JOIN subjects sub ON sec.subject_id = sub.id
                LEFT JOIN LATERAL (
                    SELECT day, start_time, end_time, room 
                    FROM section_schedules 
                    WHERE section_id = sec.id 
                    ORDER BY day, start_time 
                    LIMIT 1
                ) ss ON true
                WHERE 1=1 ${swapStudentFilter1} ${swapDateFilter1}
                
                UNION ALL
                
                SELECT 
                    sr.id,
                    'swap' as action_type,
                    u.id as user_id,
                    u.student_id as student_number,
                    u.student_name,
                    u.email as student_email,
                    u.programme as student_programme,
                    sub.code as subject_code,
                    sub.name as subject_name,
                    sec.section_number,
                    COALESCE(ss.day, sec.day) as day,
                    COALESCE(ss.start_time, sec.start_time) as start_time,
                    COALESCE(ss.end_time, sec.end_time) as end_time,
                    COALESCE(ss.room, sec.room) as room,
                    'target' as swap_role,
                    sr.created_at,
                    sr.status,
                    sr.response_reason as reason
                FROM swap_requests sr
                JOIN users u ON sr.target_id = u.id
                JOIN sections sec ON sr.target_section_id = sec.id
                JOIN subjects sub ON sec.subject_id = sub.id
                LEFT JOIN LATERAL (
                    SELECT day, start_time, end_time, room 
                    FROM section_schedules 
                    WHERE section_id = sec.id 
                    ORDER BY day, start_time 
                    LIMIT 1
                ) ss ON true
                WHERE 1=1 ${swapStudentFilter2} ${swapDateFilter2}
                
                ORDER BY created_at DESC
            `;
            const swaps = await query(swapQuery, swapParams);
            logs.push(...swaps.rows);
        }

        // Get manual joins if action_type is 'all' or 'manual_join'
        if (!action_type || action_type === 'all' || action_type === 'manual_join') {
            let mjParams = [];
            let mjParamCount = 1;
            let mjStudentFilter = '';
            let mjDateFilter = '';

            if (student_search) {
                mjStudentFilter = ` AND (LOWER(u.student_name) LIKE LOWER($${mjParamCount}) OR LOWER(u.student_id) LIKE LOWER($${mjParamCount}))`;
                mjParams.push(`%${student_search}%`);
                mjParamCount++;
            }
            if (start_date) {
                mjDateFilter += ` AND mj.created_at >= $${mjParamCount}`;
                mjParams.push(start_date);
                mjParamCount++;
            }
            if (end_date) {
                mjDateFilter += ` AND mj.created_at <= $${mjParamCount}`;
                mjParams.push(end_date);
                mjParamCount++;
            }

            const manualJoinQuery = `
                SELECT 
                    mj.id,
                    'manual_join' as action_type,
                    u.id as user_id,
                    u.student_id as student_number,
                    u.student_name,
                    u.email as student_email,
                    u.programme as student_programme,
                    sub.code as subject_code,
                    sub.name as subject_name,
                    sec.section_number,
                    sec.day,
                    sec.start_time,
                    sec.end_time,
                    sec.room,
                    NULL as registration_type,
                    mj.created_at,
                    mj.status,
                    mj.reason
                FROM manual_join_requests mj
                JOIN users u ON mj.student_id = u.id
                JOIN sections sec ON mj.section_id = sec.id
                JOIN subjects sub ON sec.subject_id = sub.id
                WHERE 1=1 ${mjStudentFilter} ${mjDateFilter}
                ORDER BY mj.created_at DESC
            `;
            const manualJoins = await query(manualJoinQuery, mjParams);
            logs.push(...manualJoins.rows);
        }

        // Sort all logs by created_at descending
        logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Apply pagination
        const totalCount = logs.length;
        const paginatedLogs = logs.slice(offset, offset + parseInt(limit));

        res.json({
            success: true,
            data: {
                logs: paginatedLogs,
                pagination: {
                    total: totalCount,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalCount / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('[STUDENT-LOGS] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// SUBJECT MANAGEMENT
// ============================================================================

router.get('/subjects', async (req, res) => {
    try {
        const { semester, programme, isActive } = req.query;
        const subjects = await hopService.getAllSubjects({ semester, programme, isActive });

        res.json({ success: true, data: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/subjects', async (req, res) => {
    try {
        const { code, name, creditHours, semester, programme, description, prerequisites } = req.body;

        const subject = await hopService.createSubject(
            code, name, creditHours, semester, programme, description, prerequisites, req.user.id
        );

        res.status(201).json({ success: true, data: subject });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/subjects/:id', async (req, res) => {
    try {
        const subject = await hopService.updateSubject(req.params.id, req.body);
        res.json({ success: true, data: subject });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/subjects/:id', async (req, res) => {
    try {
        const result = await hopService.deleteSubject(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ============================================================================
// SECTION MANAGEMENT
// ============================================================================

// Get all lecturers for dropdown
router.get('/lecturers', async (req, res) => {
    try {
        const { query } = require('../database/connection');
        const result = await query(`
            SELECT id, lecturer_id, lecturer_name, email
            FROM users
            WHERE role = 'lecturer' AND is_active = true
            ORDER BY lecturer_name
        `);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/sections', async (req, res) => {
    try {
        const { subjectId, lecturerId, isActive, semester } = req.query;
        const sections = await hopService.getAllSections({ subjectId, lecturerId, isActive, semester });

        res.json({ success: true, data: sections });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/sections', async (req, res) => {
    try {
        const { subjectId, sectionNumber, capacity, day, startTime, endTime, room, building, lecturerId } = req.body;

        const section = await hopService.createSection(
            subjectId, sectionNumber, capacity, day, startTime, endTime, room, building, lecturerId
        );

        res.status(201).json({ success: true, data: section });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/sections/:id', async (req, res) => {
    try {
        const section = await hopService.updateSection(req.params.id, req.body);
        res.json({ success: true, data: section });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/sections/:id/assign-lecturer', async (req, res) => {
    try {
        const { lecturerId } = req.body;

        if (!lecturerId) {
            return res.status(400).json({ success: false, message: 'Lecturer ID is required' });
        }

        const section = await hopService.assignLecturerToSection(req.params.id, lecturerId);
        res.json({ success: true, data: section });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/sections/:id', async (req, res) => {
    try {
        const result = await hopService.deleteSection(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/sections/:id/students', async (req, res) => {
    try {
        const students = await hopService.getSectionStudents(req.params.id);
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// REGISTRATION OVERRIDE
// ============================================================================

router.put('/registrations/:studentId/override', async (req, res) => {
    try {
        const { sectionId } = req.body;

        if (!sectionId) {
            return res.status(400).json({ success: false, message: 'Section ID is required' });
        }

        const result = await hopService.overrideRegistration(req.params.studentId, sectionId, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ============================================================================
// REQUEST MANAGEMENT
// ============================================================================

router.get('/swap-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const swapRequests = await swapService.getSwapRequestsForLecturer(req.user.id, status || 'pending');

        res.json({ success: true, data: swapRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/manual-join-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const requests = await manualJoinService.getAllManualJoinRequests(status);

        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/manual-join-requests/:id/approve', async (req, res) => {
    try {
        const { approvalReason } = req.body;

        const result = await manualJoinService.approveManualJoinRequest(
            req.params.id, req.user.id, req.user.role, approvalReason
        );

        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/manual-join-requests/:id/reject', async (req, res) => {
    try {
        const { rejectionReason } = req.body;

        if (!rejectionReason) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        }

        const result = await manualJoinService.rejectManualJoinRequest(
            req.params.id, req.user.id, req.user.role, rejectionReason
        );

        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ============================================================================
// TIMETABLE & REPORTS
// ============================================================================

router.get('/timetable', async (req, res) => {
    try {
        const { semester, programme, day } = req.query;
        const timetable = await schedulingService.getGlobalTimetable({ semester, programme, day });

        res.json({ success: true, data: timetable });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/statistics', async (req, res) => {
    try {
        const stats = await schedulingService.getEnrollmentStatistics();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// DROP REQUESTS
// ============================================================================

/**
 * GET /api/hop/drop-requests/pending
 * Get pending drop requests
 */
router.get('/drop-requests/pending', async (req, res) => {
    try {
        const dropRequestService = require('../services/dropRequest.service');
        const requests = await dropRequestService.getAllDropRequests('pending');

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('[HOP] Error fetching drop requests:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/hop/drop-requests/:requestId/approve
 * Approve a drop request
 */
router.post('/drop-requests/:requestId/approve', async (req, res) => {
    try {
        const { approval_reason } = req.body;
        const dropRequestService = require('../services/dropRequest.service');

        const result = await dropRequestService.approveDropRequest(
            req.params.requestId,
            req.user.id,
            approval_reason
        );

        res.json(result);
    } catch (error) {
        console.error('[HOP] Error approving drop request:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/hop/drop-requests/:requestId/reject
 * Reject a drop request
 */
router.post('/drop-requests/:requestId/reject', async (req, res) => {
    try {
        const { rejection_reason } = req.body;
        const dropRequestService = require('../services/dropRequest.service');

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const result = await dropRequestService.rejectDropRequest(
            req.params.requestId,
            req.user.id,
            rejection_reason
        );

        res.json(result);
    } catch (error) {
        console.error('[HOP] Error rejecting drop request:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// CSV EXPORTS
// ============================================================================

router.get('/export/registrations', async (req, res) => {
    try {
        const { semester, programme, subjectCode } = req.query;
        const csv = await schedulingService.exportRegistrationsToCSV({ semester, programme, subjectCode });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=registrations.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/export/section-summary', async (req, res) => {
    try {
        const { semester, programme } = req.query;
        const csv = await schedulingService.exportSectionSummaryToCSV({ semester, programme });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=section-summary.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// CSV IMPORT ENDPOINTS
// ============================================================================

/**
 * POST /api/hop/subjects/bulk-create
 * Bulk create subjects - used by EdupageDataView for missing subjects
 * Expected format: { subjects: [{ code, name, credit_hours, semester, programme }] }
 * Handles "/" in codes by splitting into multiple subjects
 */
router.post('/subjects/bulk-create', async (req, res) => {
    try {
        const { subjects } = req.body;

        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No subjects data provided'
            });
        }

        const results = { created: 0, skipped: 0, errors: [], created_subjects: [] };
        const { query } = require('../database/connection');

        for (const subject of subjects) {
            try {
                // Validate required fields
                if (!subject.code || !subject.name) {
                    results.errors.push(`Row missing required fields: code=${subject.code}, name=${subject.name}`);
                    results.skipped++;
                    continue;
                }

                // Handle "/" in codes - split into multiple subjects
                const codes = subject.code.split(/\s*\/\s*/).map(c => c.trim()).filter(c => c.length >= 4);

                for (const code of codes) {
                    // Check if subject already exists
                    const existing = await query('SELECT id FROM subjects WHERE code = $1', [code]);

                    if (existing.rows.length > 0) {
                        results.skipped++;
                        continue;
                    }

                    // Sanitize semester - must be 1-11, default to 1 if invalid
                    let semester = parseInt(subject.semester) || 1;
                    if (semester < 1 || semester > 11) {
                        semester = 1;
                    }

                    // Clean up name - remove section suffixes like "_14", "_03"
                    let name = subject.name || code;
                    name = name.replace(/_\d+$/, '').trim();
                    if (!name || name.length < 2) name = code;

                    // Create subject with all fields including programme
                    const newSubject = await query(
                        `INSERT INTO subjects (code, name, credit_hours, semester, programme)
                         VALUES ($1, $2, $3, $4, $5)
                         RETURNING id, code, name`,
                        [
                            code,
                            name,
                            parseInt(subject.credit_hours) || 3,
                            semester,
                            subject.programme || 'UNKNOWN'
                        ]
                    );

                    results.created++;
                    results.created_subjects.push(newSubject.rows[0]);
                }
            } catch (err) {
                console.error(`[BULK-CREATE] Error creating ${subject.code}:`, err.message);
                results.errors.push(`Error creating ${subject.code}: ${err.message}`);
                results.skipped++;
            }
        }

        console.log(`[BULK-CREATE] Results: created=${results.created}, skipped=${results.skipped}, errors=${results.errors.length}`);
        if (results.errors.length > 0) {
            console.log(`[BULK-CREATE] Errors:`, results.errors);
        }

        res.json({
            success: true,
            message: `Added ${results.created} subjects successfully!`,
            data: results
        });
    } catch (error) {
        console.error('[HOP] Bulk create subjects error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/hop/subjects/import
 * Bulk import subjects from CSV
 * Expected format: { subjects: [{ code, name, credit_hours, semester, programme }] }
 */
router.post('/subjects/import', async (req, res) => {
    try {
        const { subjects } = req.body;

        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No subjects data provided'
            });
        }

        const results = { created: 0, skipped: 0, errors: [] };
        const { query } = require('../database/connection');

        for (const subject of subjects) {
            try {
                // Validate required fields
                if (!subject.code || !subject.name) {
                    results.errors.push(`Row missing required fields: code=${subject.code}, name=${subject.name}`);
                    results.skipped++;
                    continue;
                }

                // Check if subject already exists
                const existing = await query('SELECT id FROM subjects WHERE code = $1', [subject.code]);

                if (existing.rows.length > 0) {
                    results.skipped++;
                    continue;
                }

                // Use programme from import data - MUST be provided in CSV
                // Do not auto-extract from subject code as that's incorrect
                const programme = subject.programme || 'UNKNOWN';

                // Create subject with programme
                await query(
                    `INSERT INTO subjects (code, name, credit_hours, semester, programme)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        subject.code,
                        subject.name,
                        parseInt(subject.credit_hours) || 3,
                        parseInt(subject.semester) || 1,
                        programme
                    ]
                );
                results.created++;
            } catch (err) {
                results.errors.push(`Error creating ${subject.code}: ${err.message}`);
                results.skipped++;
            }
        }

        res.json({
            success: true,
            message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/hop/sections/import
 * Bulk import sections from CSV
 * Expected format: { sections: [{ subject_code, section_number, day, start_time, end_time, room, capacity, lecturer_email }] }
 */
router.post('/sections/import', async (req, res) => {
    try {
        const { sections } = req.body;

        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No sections data provided'
            });
        }

        const { query } = require('../database/connection');
        const results = { created: 0, skipped: 0, errors: [] };

        for (const section of sections) {
            try {
                // Validate required fields
                if (!section.subject_code || !section.section_number || !section.day) {
                    results.errors.push(`Row missing required fields: subject_code=${section.subject_code}`);
                    results.skipped++;
                    continue;
                }

                // Find subject
                const subjectResult = await query(
                    'SELECT id FROM subjects WHERE code = $1',
                    [section.subject_code]
                );

                if (subjectResult.rows.length === 0) {
                    results.errors.push(`Subject not found: ${section.subject_code}`);
                    results.skipped++;
                    continue;
                }

                const subjectId = subjectResult.rows[0].id;

                // Find lecturer if email provided
                let lecturerId = null;
                if (section.lecturer_email) {
                    const lecturerResult = await query(
                        `SELECT id FROM users WHERE email = $1 AND role = 'lecturer'`,
                        [section.lecturer_email]
                    );
                    if (lecturerResult.rows.length > 0) {
                        lecturerId = lecturerResult.rows[0].id;
                    }
                }

                // Check if section already exists
                const existingSection = await query(
                    'SELECT id FROM sections WHERE subject_id = $1 AND section_number = $2',
                    [subjectId, section.section_number]
                );

                if (existingSection.rows.length > 0) {
                    results.skipped++;
                    continue;
                }

                // Create section
                await hopService.createSection(
                    subjectId,
                    section.section_number,
                    section.day.toLowerCase(),
                    section.start_time || '08:00:00',
                    section.end_time || '10:00:00',
                    section.room || 'TBA',
                    parseInt(section.capacity) || 30,
                    lecturerId
                );
                results.created++;
            } catch (err) {
                results.errors.push(`Error creating section: ${err.message}`);
                results.skipped++;
            }
        }

        res.json({
            success: true,
            message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/hop/lecturers/assign-bulk
 * Bulk assign lecturers to sections via CSV
 * Expected format: { assignments: [{ lecturer_email, subject_code, section_number }] }
 */
router.post('/lecturers/assign-bulk', async (req, res) => {
    try {
        const { assignments } = req.body;

        if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No assignments data provided'
            });
        }

        const { query } = require('../database/connection');
        const results = { assigned: 0, skipped: 0, errors: [] };

        for (const assignment of assignments) {
            try {
                // Find lecturer
                const lecturerResult = await query(
                    `SELECT id FROM users WHERE email = $1 AND role = 'lecturer'`,
                    [assignment.lecturer_email]
                );

                if (lecturerResult.rows.length === 0) {
                    results.errors.push(`Lecturer not found: ${assignment.lecturer_email}`);
                    results.skipped++;
                    continue;
                }

                // Find section
                const sectionResult = await query(
                    `SELECT s.id FROM sections s
                     JOIN subjects sub ON s.subject_id = sub.id
                     WHERE sub.code = $1 AND s.section_number = $2`,
                    [assignment.subject_code, assignment.section_number]
                );

                if (sectionResult.rows.length === 0) {
                    results.errors.push(`Section not found: ${assignment.subject_code} - Section ${assignment.section_number}`);
                    results.skipped++;
                    continue;
                }

                // Update section with lecturer
                await query(
                    'UPDATE sections SET lecturer_id = $1 WHERE id = $2',
                    [lecturerResult.rows[0].id, sectionResult.rows[0].id]
                );
                results.assigned++;
            } catch (err) {
                results.errors.push(`Error assigning: ${err.message}`);
                results.skipped++;
            }
        }

        res.json({
            success: true,
            message: `Assignment complete: ${results.assigned} assigned, ${results.skipped} skipped`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// EDUPAGE TIMETABLE SYNC
// ============================================================================

/**
 * POST /api/hop/edupage/sync
 * Manually fetch timetable data from Edupage API and store locally
 * This is the ONLY endpoint that calls the external Edupage API
 */
router.post('/edupage/sync', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await edupageService.syncAndStore(userId);

        res.json({
            success: true,
            message: `Timetable synced successfully. ${result.recordCount} records fetched.`,
            data: result.data,
            syncedAt: result.syncedAt
        });
    } catch (error) {
        console.error('Edupage sync error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync from Edupage',
            message: error.message
        });
    }
});

/**
 * GET /api/hop/edupage/data
 * Get stored timetable data from local database (NO API call)
 * Called on page load to display existing data
 */
router.get('/edupage/data', async (req, res) => {
    try {
        const result = await edupageService.getStoredData();

        res.json({
            success: true,
            data: result.data,
            syncedAt: result.syncedAt,
            daysSinceSync: result.daysSinceSync,
            isStale: result.isStale,
            message: result.message
        });
    } catch (error) {
        console.error('Get Edupage data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve timetable data',
            message: error.message
        });
    }
});

/**
 * GET /api/hop/edupage/logs
 * Get sync history logs for audit purposes
 */
router.get('/edupage/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const logs = await edupageService.getSyncLogs(limit);

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Get Edupage logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve sync logs',
            message: error.message
        });
    }
});

/**
 * POST /api/hop/edupage/import-sections
 * Import sections from Edupage timetable data into the sections table
 * Creates subjects if they don't exist, then creates/updates sections
 */
router.post('/edupage/import-sections', async (req, res) => {
    try {
        // Optional: allow specifying which class prefixes to import
        const targetPrefixes = req.body.prefixes || ['CT206', 'CT204', 'CC101'];

        const result = await edupageService.importSectionsFromTimetable(targetPrefixes);

        // Check if there are missing subjects that need to be added first
        if (result.hasMissingSubjects) {
            return res.json({
                success: false,
                hasMissingSubjects: true,
                missingSubjects: result.missingSubjects,
                message: result.message,
                summary: result.summary,
                skipped: result.skipped
            });
        }

        res.json({
            success: true,
            message: `Import complete: ${result.summary.created} created, ${result.summary.updated} updated`,
            summary: result.summary,
            imported: result.imported?.slice(0, 50) || [], // Limit response size
            errors: result.errors,
            skipped: result.skipped
        });
    } catch (error) {
        console.error('Import sections error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import sections',
            message: error.message
        });
    }
});

// ============================================================================
// SUBJECT IMPORT FROM FILE
// ============================================================================

/**
 * POST /api/hop/subjects/import-file
 * Import subjects from uploaded file (CSV, XLSX, or PDF)
 * Accepts 'programme' in request body to assign to all subjects
 */
router.post('/subjects/import-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Get the selected programme from the request
        const selectedProgramme = req.body.programme || 'UNKNOWN';
        console.log('[IMPORT] Using programme:', selectedProgramme);

        const result = await subjectImportService.processFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            selectedProgramme  // Pass the programme to the service
        );

        res.json({
            success: result.success,
            message: result.message,
            results: result.results,
            parsed: result.parsed?.slice(0, 50) // Limit response size
        });
    } catch (error) {
        console.error('Subject import error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import subjects',
            message: error.message
        });
    }
});

/**
 * POST /api/hop/subjects/import-file/preview
 * Preview subjects from uploaded file without importing
 */
router.post('/subjects/import-file/preview', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const ext = req.file.originalname.toLowerCase().split('.').pop();
        let subjects = [];

        if (ext === 'csv') {
            subjects = subjectImportService.parseCSV(req.file.buffer.toString('utf-8'));
        } else if (ext === 'xlsx' || ext === 'xls') {
            subjects = subjectImportService.parseXLSX(req.file.buffer);
        } else if (ext === 'pdf') {
            subjects = await subjectImportService.parsePDF(req.file.buffer);
        }

        res.json({
            success: true,
            message: `Found ${subjects.length} subjects in file`,
            subjects: subjects.slice(0, 100), // Preview first 100
            total: subjects.length
        });
    } catch (error) {
        console.error('Subject preview error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to parse file',
            message: error.message
        });
    }
});

module.exports = router;

