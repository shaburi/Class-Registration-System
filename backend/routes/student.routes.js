const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { permissions, validateSemesterAccess } = require('../middleware/rbac');
const { query } = require('../database/connection');
const registrationService = require('../services/registration.service');
const swapService = require('../services/swap.service');
const manualJoinService = require('../services/manualJoin.service');
const schedulingService = require('../services/scheduling.service');
const edupageService = require('../services/edupage.service');

// All student routes require authentication and student role
router.use(authenticate);
router.use((req, res, next) => {
    console.log('[STUDENT ROUTES] Request:', req.method, req.path, 'User:', req.user?.email);
    next();
});
router.use(permissions.canViewOwnRegistrations);

// ============================================================================
// PROFILE
// ============================================================================

/**
 * GET /api/student/profile
 * Get student profile information
 */
router.get('/profile', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role,
                student_id: req.user.studentId || req.user.student_id,
                student_name: req.user.studentName || req.user.student_name,
                semester: req.user.semester,
                programme: req.user.programme
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PUT /api/student/profile
 * Update student profile (semester, programme)
 */
router.put('/profile', async (req, res) => {
    try {
        const { semester, programme, student_name } = req.body;

        // Allowed programmes
        const allowedProgrammes = ['CT206', 'CT204', 'CC101'];

        // Validate programme
        if (programme && !allowedProgrammes.includes(programme)) {
            return res.status(400).json({
                success: false,
                message: `Invalid programme. Allowed: ${allowedProgrammes.join(', ')}`
            });
        }

        // Validate semester based on programme type
        if (semester) {
            const maxSemester = programme === 'CC101' ? 6 : 8; // Diploma vs Degree
            if (semester < 1 || semester > maxSemester) {
                return res.status(400).json({
                    success: false,
                    message: `Semester must be between 1 and ${maxSemester}`
                });
            }
        }

        // Build update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (semester) {
            updates.push(`semester = $${paramCount++}`);
            values.push(semester);
        }
        if (programme) {
            updates.push(`programme = $${paramCount++}`);
            values.push(programme);
        }
        if (student_name) {
            updates.push(`student_name = $${paramCount++}`);
            values.push(student_name);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(req.user.id);

        const result = await query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
            values
        );

        const updatedUser = result.rows[0];

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                student_id: updatedUser.student_id,
                student_name: updatedUser.student_name,
                semester: updatedUser.semester,
                programme: updatedUser.programme
            }
        });
    } catch (error) {
        console.error('[STUDENT] Profile update error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// SUBJECT & SECTION VIEWING
// ============================================================================

/**
 * GET /api/student/subjects
 * View available subjects for student's semester
 */
router.get('/subjects', validateSemesterAccess(), async (req, res) => {
    try {
        console.log('[STUDENT SUBJECTS] Querying for semester:', req.user.semester, 'programme:', req.user.programme);
        const sections = await registrationService.getAvailableSections(
            req.user.semester,
            req.user.programme
        );

        console.log('[STUDENT SUBJECTS] Found', sections.length, 'sections');
        res.json({
            success: true,
            data: sections
        });
    } catch (error) {
        console.error('[STUDENT SUBJECTS] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/student/semester-timetable
 * View global timetable for student's semester (all sections, not just registered)
 */
router.get('/semester-timetable', validateSemesterAccess(), async (req, res) => {
    try {
        const studentSemester = req.user.semester;
        console.log('[STUDENT SEMESTER TIMETABLE] Fetching for semester:', studentSemester);

        const result = await query(`
            SELECT 
                sec.id,
                sec.section_number,
                sec.day,
                sec.start_time,
                sec.end_time,
                sec.room,
                sec.capacity,
                sec.enrolled_count,
                sub.id as subject_id,
                sub.code as subject_code,
                sub.name as subject_name,
                sub.semester,
                u.lecturer_name
            FROM sections sec
            JOIN subjects sub ON sec.subject_id = sub.id
            LEFT JOIN users u ON sec.lecturer_id = u.id
            WHERE sub.semester <= $1 AND sec.is_active = true
            ORDER BY sub.semester, sec.day, sec.start_time, sub.code
        `, [studentSemester]);

        let sections = result.rows;

        // Fetch schedules from section_schedules table
        if (sections.length > 0) {
            const sectionIds = [...new Set(sections.map(s => s.id))];
            const schedulesResult = await query(
                `SELECT * FROM section_schedules WHERE section_id = ANY($1) ORDER BY section_id, day, start_time`,
                [sectionIds]
            );

            // Group schedules by section_id
            const schedulesBySection = {};
            for (const schedule of schedulesResult.rows) {
                if (!schedulesBySection[schedule.section_id]) {
                    schedulesBySection[schedule.section_id] = [];
                }
                schedulesBySection[schedule.section_id].push(schedule);
            }

            // Attach schedules and set first schedule as default
            for (const section of sections) {
                section.schedules = schedulesBySection[section.id] || [];
                if (section.schedules.length > 0) {
                    const firstSchedule = section.schedules[0];
                    section.day = firstSchedule.day;
                    section.start_time = firstSchedule.start_time;
                    section.end_time = firstSchedule.end_time;
                    section.room = firstSchedule.room || section.room;
                }
            }
        }

        console.log('[STUDENT SEMESTER TIMETABLE] Found', sections.length, 'sections');
        res.json({
            success: true,
            data: {
                semester: studentSemester,
                sections: sections
            }
        });
    } catch (error) {
        console.error('[STUDENT SEMESTER TIMETABLE] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/student/asc-timetable
 * Get ASC timetable data for students (read-only)
 * Allows students to view lecturer schedules
 */
router.get('/asc-timetable', async (req, res) => {
    try {
        const result = await edupageService.getStoredData();

        res.json({
            success: true,
            data: result.data,
            syncedAt: result.syncedAt,
            message: result.message
        });
    } catch (error) {
        console.error('[STUDENT ASC TIMETABLE] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve ASC timetable data'
        });
    }
});

/**
 * GET /api/student/sections/:sectionId/students
 * Get students registered in a specific section (for swap requests)
 */
router.get('/sections/:sectionId/students', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                u.id,
                u.student_id,
                u.student_name,
                u.email
            FROM registrations r
            JOIN users u ON r.student_id = u.id
            WHERE r.section_id = $1 AND u.id != $2
            ORDER BY u.student_name
        `, [req.params.sectionId, req.user.id]); // Exclude current user

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// SMART RECOMMENDATIONS
// ============================================================================

/**
 * GET /api/student/recommendations
 * Get smart course recommendations based on popularity and schedule compatibility
 */
router.get('/recommendations', async (req, res) => {
    try {
        const studentId = req.user.id;

        // Get student's current registrations
        const registeredResult = await query(`
            SELECT sec.id as section_id, sec.subject_id, sec.day, sec.start_time, sec.end_time
            FROM registrations r
            JOIN sections sec ON r.section_id = sec.id
            WHERE r.student_id = $1
        `, [studentId]);

        const registeredSubjectIds = registeredResult.rows.map(r => r.subject_id);
        const registeredSchedule = registeredResult.rows;

        // Get popular subjects not yet registered
        const recommendationsResult = await query(`
            SELECT 
                s.id,
                s.code,
                s.name,
                s.credit_hours,
                COUNT(r.id) as popularity,
                (
                    SELECT COUNT(*) FROM sections sec2 
                    WHERE sec2.subject_id = s.id AND sec2.enrolled_count < sec2.capacity
                ) as available_sections
            FROM subjects s
            LEFT JOIN sections sec ON s.id = sec.subject_id
            LEFT JOIN registrations r ON sec.id = r.section_id
            WHERE s.id NOT IN (SELECT UNNEST($1::uuid[]))
            GROUP BY s.id, s.code, s.name, s.credit_hours
            HAVING (
                SELECT COUNT(*) FROM sections sec3 
                WHERE sec3.subject_id = s.id AND sec3.enrolled_count < sec3.capacity
            ) > 0
            ORDER BY popularity DESC
            LIMIT 5
        `, [registeredSubjectIds.length > 0 ? registeredSubjectIds : ['00000000-0000-0000-0000-000000000000']]);

        res.json({
            success: true,
            data: recommendationsResult.rows.map(r => ({
                ...r,
                popularity: parseInt(r.popularity),
                available_sections: parseInt(r.available_sections),
                reason: r.popularity > 10 ? 'Popular choice' : r.available_sections > 2 ? 'Many sections available' : 'Recommended'
            }))
        });
    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/student/schedule-conflicts/:sectionId
 * Check if a section conflicts with student's current schedule
 */
router.get('/schedule-conflicts/:sectionId', async (req, res) => {
    try {
        const studentId = req.user.id;
        const sectionId = req.params.sectionId;

        // Get the target section details
        const targetResult = await query(`
            SELECT day, start_time, end_time, subject_id
            FROM sections WHERE id = $1
        `, [sectionId]);

        if (targetResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Section not found' });
        }

        const target = targetResult.rows[0];

        // Check for conflicts with current registrations
        const conflictsResult = await query(`
            SELECT 
                sec.id,
                sec.section_number,
                sec.day,
                sec.start_time,
                sec.end_time,
                s.code as subject_code,
                s.name as subject_name
            FROM registrations r
            JOIN sections sec ON r.section_id = sec.id
            JOIN subjects s ON sec.subject_id = s.id
            WHERE r.student_id = $1
              AND sec.day = $2
              AND (
                  (sec.start_time < $4 AND sec.end_time > $3)
              )
        `, [studentId, target.day, target.start_time, target.end_time]);

        res.json({
            success: true,
            data: {
                hasConflict: conflictsResult.rows.length > 0,
                conflicts: conflictsResult.rows
            }
        });
    } catch (error) {
        console.error('Conflict check error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// REGISTRATION MANAGEMENT
// ============================================================================

/**
 * POST /api/student/register/:sectionId
 * Register for a section
 */
router.post('/register/:sectionId', async (req, res) => {
    try {
        const result = await registrationService.registerForSection(
            req.user.id,
            req.params.sectionId
        );

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/student/bulk-register
 * Register for multiple courses at once (from timetable builder)
 * Creates registrations directly from ASC/timetable data
 */
router.post('/bulk-register', async (req, res) => {
    try {
        const { courses } = req.body;
        const studentId = req.user.id;

        if (!courses || !Array.isArray(courses) || courses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No courses provided'
            });
        }

        console.log('[BULK REGISTER] Student', studentId, 'registering', courses.length, 'courses');

        const results = [];
        const errors = [];

        for (const course of courses) {
            try {
                // Extract base subject code and section number from course.subjectCode
                // e.g., "UCS3143_16" -> baseCode="UCS3143", sectionNum="16"
                // e.g., "NWC3293/NWC4233_01" -> baseCode="NWC3293/NWC4233", sectionNum="01"
                const subjectCodeParts = (course.subjectCode || '').match(/^(.+?)_(\d+)$/);
                let baseSubjectCode = subjectCodeParts ? subjectCodeParts[1] : course.subjectCode;
                const sectionNum = subjectCodeParts ? subjectCodeParts[2] : '01';

                console.log('[BULK REGISTER] Looking for subject:', baseSubjectCode, 'section:', sectionNum);

                // Handle subject codes with "/" (e.g., "NWC3293/NWC4233")
                // Try each alternative code and use the first one that exists in database
                let subjectId = null;
                let foundSubjectCode = baseSubjectCode;

                if (baseSubjectCode.includes('/')) {
                    const alternativeCodes = baseSubjectCode.split('/').map(c => c.trim());
                    console.log('[BULK REGISTER] Subject has alternatives:', alternativeCodes);

                    for (const altCode of alternativeCodes) {
                        const result = await query(
                            `SELECT id FROM subjects WHERE code = $1`,
                            [altCode]
                        );
                        if (result.rows.length > 0) {
                            subjectId = result.rows[0].id;
                            foundSubjectCode = altCode;
                            console.log('[BULK REGISTER] Found existing subject via alternative:', altCode, 'id:', subjectId);
                            break;
                        }
                    }

                    // If none found, use the first code to create new
                    if (!subjectId) {
                        foundSubjectCode = alternativeCodes[0];
                    }
                } else {
                    // Normal single code lookup
                    const result = await query(
                        `SELECT id FROM subjects WHERE code = $1`,
                        [baseSubjectCode]
                    );
                    if (result.rows.length > 0) {
                        subjectId = result.rows[0].id;
                        console.log('[BULK REGISTER] Found existing subject:', baseSubjectCode, 'id:', subjectId);
                    }
                }

                // Create subject if not found
                if (!subjectId) {
                    const newSubject = await query(
                        `INSERT INTO subjects (code, name, credit_hours, semester, programme)
                         VALUES ($1, $2, 3, 1, $3)
                         RETURNING id`,
                        [foundSubjectCode, course.subjectName || foundSubjectCode, course.programme || 'GENERAL']
                    );
                    subjectId = newSubject.rows[0].id;
                    console.log('[BULK REGISTER] Created new subject:', foundSubjectCode, 'id:', subjectId);
                }

                // Normalize day to lowercase for enum
                const normalizedDay = (course.day || 'monday').toLowerCase();

                // Try to find existing section by subject_id and section_number first (HOP-created sections)
                let sectionResult = await query(
                    `SELECT id FROM sections 
                     WHERE subject_id = $1 AND section_number = $2`,
                    [subjectId, sectionNum]
                );

                // If not found by section_number, try by day and time
                if (sectionResult.rows.length === 0) {
                    sectionResult = await query(
                        `SELECT id FROM sections 
                         WHERE subject_id = $1 AND day = $2 AND start_time = $3`,
                        [subjectId, normalizedDay, course.startTime]
                    );
                }

                let sectionId;
                if (sectionResult.rows.length === 0) {
                    // Create section if doesn't exist
                    const newSection = await query(
                        `INSERT INTO sections (subject_id, section_number, lecturer_id, day, start_time, end_time, room, capacity, is_active)
                         VALUES ($1, $2, NULL, $3, $4, $5, $6, 40, true)
                         RETURNING id`,
                        [subjectId, sectionNum, normalizedDay, course.startTime, course.endTime, course.room || 'TBA']
                    );
                    sectionId = newSection.rows[0].id;
                    console.log('[BULK REGISTER] Created new section:', sectionNum, 'id:', sectionId);
                } else {
                    sectionId = sectionResult.rows[0].id;
                    console.log('[BULK REGISTER] Found existing section:', sectionNum, 'id:', sectionId);
                }

                // Check if already registered for this section
                const existingReg = await query(
                    `SELECT id FROM registrations WHERE student_id = $1 AND section_id = $2`,
                    [studentId, sectionId]
                );

                if (existingReg.rows.length > 0) {
                    results.push({ course: course.subjectCode, status: 'already_registered' });
                    continue;
                }

                // Create registration
                await query(
                    `INSERT INTO registrations (student_id, section_id, registration_type)
                     VALUES ($1, $2, 'normal')`,
                    [studentId, sectionId]
                );

                results.push({ course: course.subjectCode, status: 'success', sectionId });
            } catch (courseError) {
                console.error('[BULK REGISTER] Error for course', course.subjectCode, ':', courseError.message);
                errors.push({ course: course.subjectCode, error: courseError.message });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;

        res.json({
            success: successCount > 0,
            message: `Registered ${successCount} of ${courses.length} courses`,
            results,
            errors
        });
    } catch (error) {
        console.error('[BULK REGISTER] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/student/register/:registrationId
 * Unregister from a section
 */
router.delete('/register/:registrationId', async (req, res) => {
    try {
        const result = await registrationService.unregisterFromSection(
            req.user.id,
            req.params.registrationId
        );

        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/student/registrations
 * View current registrations
 */
router.get('/registrations', async (req, res) => {
    try {
        const registrations = await registrationService.getStudentRegistrations(req.user.id);

        res.json({
            success: true,
            data: registrations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/student/drop-request
 * Create a drop request (requires HOP approval)
 */
router.post('/drop-request', async (req, res) => {
    try {
        const { registration_id, reason } = req.body;
        const dropRequestService = require('../services/dropRequest.service');

        if (!registration_id || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Registration ID and reason are required'
            });
        }

        const result = await dropRequestService.createDropRequest(
            req.user.id,
            registration_id,
            reason
        );

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/student/drop-requests
 * View drop requests
 */
router.get('/drop-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const dropRequestService = require('../services/dropRequest.service');
        const requests = await dropRequestService.getDropRequestsForStudent(req.user.id, status);

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/student/drop-request/:id
 * Delete a drop request (only if not pending)
 */
router.delete('/drop-request/:id', async (req, res) => {
    try {
        const requestId = req.params.id;

        // Check if request exists and belongs to student
        const checkResult = await query(`
            SELECT id, status, student_id 
            FROM drop_requests 
            WHERE id = $1
        `, [requestId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Drop request not found'
            });
        }

        const request = checkResult.rows[0];

        if (request.student_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own requests'
            });
        }

        if (request.status === 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete pending requests. Please wait for HOP approval or rejection.'
            });
        }

        // Delete the request
        await query('DELETE FROM drop_requests WHERE id = $1', [requestId]);

        res.json({
            success: true,
            message: 'Drop request deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// MANUAL JOIN REQUESTS
// ============================================================================

/**
 * POST /api/student/manual-join
 * Create a manual join request for a full section
 */
router.post('/manual-join', async (req, res) => {
    try {
        const { section_id, reason } = req.body;

        if (!section_id || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Section ID and reason are required'
            });
        }

        const result = await manualJoinService.createManualJoinRequest(
            req.user.id,
            section_id,
            reason
        );

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// SWAP REQUESTS
// ============================================================================

/**
 * POST /api/student/swap-request
 * Create a swap request
 */
router.post('/swap-request', async (req, res) => {
    try {
        const { requesterSectionId, targetId, targetSectionId } = req.body;

        if (!requesterSectionId || !targetId || !targetSectionId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: requesterSectionId, targetId, targetSectionId'
            });
        }

        const result = await swapService.createSwapRequest(
            req.user.id,
            requesterSectionId,
            targetId,
            targetSectionId
        );

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PUT /api/student/swap-request/:id/respond
 * Respond to a swap request (accept/reject)
 */
router.put('/swap-request/:id/respond', async (req, res) => {
    try {
        const { accept, reason } = req.body;

        if (accept === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: accept (boolean)'
            });
        }

        const result = await swapService.respondToSwapRequest(
            req.params.id,
            req.user.id,
            accept,
            reason
        );

        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/student/swap-requests
 * View swap requests (as requester or target)
 */
router.get('/swap-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const swapRequests = await swapService.getSwapRequests(req.user.id, status);

        res.json({
            success: true,
            data: swapRequests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/student/swap-request/:id
 * Delete a completed swap request (approved, rejected, or cancelled)
 */
router.delete('/swap-request/:id', async (req, res) => {
    try {
        const result = await swapService.deleteSwapRequest(req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// MANUAL JOIN REQUESTS
// ============================================================================

/**
 * POST /api/student/manual-join-request
 * Request manual join for full section
 */
router.post('/manual-join-request', async (req, res) => {
    try {
        const { sectionId, reason } = req.body;

        if (!sectionId || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: sectionId, reason'
            });
        }

        const result = await manualJoinService.createManualJoinRequest(
            req.user.id,
            sectionId,
            reason
        );

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/student/manual-join-requests
 * View manual join requests
 */
router.get('/manual-join-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const requests = await manualJoinService.getManualJoinRequestsForStudent(req.user.id, status);

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/student/manual-join-request/:id
 * Delete a manual join request (only if not pending)
 */
router.delete('/manual-join-request/:id', async (req, res) => {
    try {
        const requestId = req.params.id;

        // Check if request exists and belongs to student
        const checkResult = await query(`
            SELECT id, status, student_id 
            FROM manual_join_requests 
            WHERE id = $1
        `, [requestId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Manual join request not found'
            });
        }

        const request = checkResult.rows[0];

        if (request.student_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own requests'
            });
        }

        if (request.status === 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete pending requests. Please wait for approval or rejection.'
            });
        }

        // Delete the request
        await query('DELETE FROM manual_join_requests WHERE id = $1', [requestId]);

        res.json({
            success: true,
            message: 'Manual join request deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// TIMETABLE
// ============================================================================

/**
 * GET /api/student/timetable
 * View personal timetable
 */
router.get('/timetable', async (req, res) => {
    try {
        const timetable = await schedulingService.getStudentTimetable(req.user.id);

        res.json({
            success: true,
            data: timetable
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// CSV IMPORT - SUBJECT FILTER
// ============================================================================

/**
 * POST /api/student/subjects/import
 * Set the student's semester subjects from CSV
 * This stores a list of subject codes that filter what the student sees
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

        // Extract subject codes from the CSV data
        const subjectCodes = subjects
            .map(s => s.subject_code || s.code)
            .filter(code => code && code.trim());

        if (subjectCodes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid subject codes found in CSV'
            });
        }

        // Validate that subjects exist
        const validSubjects = await query(
            `SELECT code FROM subjects WHERE code = ANY($1)`,
            [subjectCodes]
        );

        const validCodes = validSubjects.rows.map(s => s.code);
        const invalidCodes = subjectCodes.filter(code => !validCodes.includes(code));

        // Store the subject filter in user metadata (or a dedicated table)
        // For now, we'll store it as a JSON field in the users table
        await query(
            `UPDATE users SET subject_filter = $1 WHERE id = $2`,
            [JSON.stringify(validCodes), req.user.id]
        );

        res.json({
            success: true,
            message: `Imported ${validCodes.length} subjects`,
            data: {
                imported: validCodes,
                invalid: invalidCodes
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/student/subjects/filter
 * Get the student's subject filter
 */
router.get('/subjects/filter', async (req, res) => {
    try {
        const result = await query(
            `SELECT subject_filter FROM users WHERE id = $1`,
            [req.user.id]
        );

        const filter = result.rows[0]?.subject_filter;
        const subjectCodes = filter ? JSON.parse(filter) : [];

        res.json({
            success: true,
            data: subjectCodes
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/student/subjects/filter
 * Clear the student's subject filter (show all subjects)
 */
router.delete('/subjects/filter', async (req, res) => {
    try {
        await query(
            `UPDATE users SET subject_filter = NULL WHERE id = $1`,
            [req.user.id]
        );

        res.json({
            success: true,
            message: 'Subject filter cleared'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// GLOBAL TIMETABLE & VISUAL BUILDER
// ============================================================================

/**
 * GET /api/student/global-timetable
 * Get all sections for student's semester, grouped by timetable_group
 */
router.get('/global-timetable', async (req, res) => {
    try {
        const studentSemester = req.user.semester;
        const studentProgramme = req.user.programme;

        const result = await query(`
            SELECT 
                sec.id,
                sec.section_number,
                sec.capacity,
                sec.enrolled_count,
                sec.day,
                sec.start_time,
                sec.end_time,
                sec.room,
                sec.building,
                sec.timetable_group,
                sub.id as subject_id,
                sub.code as subject_code,
                sub.name as subject_name,
                sub.credit_hours,
                sub.semester as subject_semester,
                sub.prerequisites,
                u.lecturer_name,
                CASE WHEN sec.enrolled_count >= sec.capacity THEN true ELSE false END as is_full
            FROM sections sec
            JOIN subjects sub ON sec.subject_id = sub.id
            LEFT JOIN users u ON sec.lecturer_id = u.id
            WHERE sub.semester <= $1 
              AND sub.programme = $2
              AND sec.is_active = true
              AND sub.is_active = true
            ORDER BY sub.semester, sec.timetable_group, sub.code, sec.section_number
        `, [studentSemester, studentProgramme]);

        let sections = result.rows;

        // Fetch schedules from section_schedules table
        if (sections.length > 0) {
            const sectionIds = [...new Set(sections.map(s => s.id))];
            const schedulesResult = await query(
                `SELECT * FROM section_schedules WHERE section_id = ANY($1) ORDER BY section_id, day, start_time`,
                [sectionIds]
            );

            // Group schedules by section_id
            const schedulesBySection = {};
            for (const schedule of schedulesResult.rows) {
                if (!schedulesBySection[schedule.section_id]) {
                    schedulesBySection[schedule.section_id] = [];
                }
                schedulesBySection[schedule.section_id].push(schedule);
            }

            // Attach schedules and set first schedule as default
            for (const section of sections) {
                section.schedules = schedulesBySection[section.id] || [];
                if (section.schedules.length > 0) {
                    const firstSchedule = section.schedules[0];
                    section.day = firstSchedule.day;
                    section.start_time = firstSchedule.start_time;
                    section.end_time = firstSchedule.end_time;
                    section.room = firstSchedule.room || section.room;
                }
            }
        }

        // Group by timetable_group
        const grouped = {};
        sections.forEach(section => {
            const group = section.timetable_group || 'Ungrouped';
            if (!grouped[group]) {
                grouped[group] = [];
            }
            grouped[group].push(section);
        });

        res.json({
            success: true,
            data: {
                semester: studentSemester,
                programme: studentProgramme,
                groups: grouped,
                allSections: sections
            }
        });
    } catch (error) {
        console.error('Global timetable error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/student/validate-schedule
 * Validate a proposed schedule for conflicts
 */
router.post('/validate-schedule', async (req, res) => {
    try {
        const { sectionIds } = req.body;

        if (!sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'sectionIds array is required'
            });
        }

        // Get all sections with their schedules
        const result = await query(`
            SELECT 
                sec.id,
                sec.day,
                sec.start_time,
                sec.end_time,
                sub.code as subject_code,
                sub.name as subject_name
            FROM sections sec
            JOIN subjects sub ON sec.subject_id = sub.id
            WHERE sec.id = ANY($1)
        `, [sectionIds]);

        const sections = result.rows;
        const conflicts = [];

        // Check for time conflicts
        for (let i = 0; i < sections.length; i++) {
            for (let j = i + 1; j < sections.length; j++) {
                const a = sections[i];
                const b = sections[j];

                if (a.day === b.day) {
                    // Check time overlap
                    const aStart = a.start_time;
                    const aEnd = a.end_time;
                    const bStart = b.start_time;
                    const bEnd = b.end_time;

                    if (aStart < bEnd && bStart < aEnd) {
                        conflicts.push({
                            section1: { id: a.id, code: a.subject_code, name: a.subject_name },
                            section2: { id: b.id, code: b.subject_code, name: b.subject_name },
                            day: a.day,
                            message: `${a.subject_code} and ${b.subject_code} overlap on ${a.day}`
                        });
                    }
                }
            }
        }

        res.json({
            success: true,
            data: {
                isValid: conflicts.length === 0,
                conflicts,
                sectionsChecked: sections.length
            }
        });
    } catch (error) {
        console.error('Validate schedule error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/student/bulk-register
 * Register for multiple sections at once (for timetable builder)
 */
router.post('/bulk-register', async (req, res) => {
    try {
        const { sectionIds } = req.body;
        const studentId = req.user.id;

        if (!sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'sectionIds array is required'
            });
        }

        // First validate the schedule
        const sectionsResult = await query(`
            SELECT 
                sec.id,
                sec.day,
                sec.start_time,
                sec.end_time,
                sec.capacity,
                sec.enrolled_count,
                sub.id as subject_id,
                sub.code as subject_code
            FROM sections sec
            JOIN subjects sub ON sec.subject_id = sub.id
            WHERE sec.id = ANY($1)
        `, [sectionIds]);

        const sections = sectionsResult.rows;
        const errors = [];
        const successes = [];

        // Check for conflicts between selected sections
        for (let i = 0; i < sections.length; i++) {
            for (let j = i + 1; j < sections.length; j++) {
                const a = sections[i];
                const b = sections[j];
                if (a.day === b.day && a.start_time < b.end_time && b.start_time < a.end_time) {
                    return res.status(400).json({
                        success: false,
                        message: `Schedule conflict: ${a.subject_code} and ${b.subject_code} overlap on ${a.day}`
                    });
                }
            }
        }

        // Register for each section
        for (const section of sections) {
            try {
                // Check if already registered for this subject
                const existingReg = await query(`
                    SELECT r.id FROM registrations r
                    JOIN sections s ON r.section_id = s.id
                    WHERE r.student_id = $1 AND s.subject_id = $2
                `, [studentId, section.subject_id]);

                if (existingReg.rows.length > 0) {
                    errors.push({ sectionId: section.id, code: section.subject_code, reason: 'Already registered for this subject' });
                    continue;
                }

                // Check capacity
                if (section.enrolled_count >= section.capacity) {
                    errors.push({ sectionId: section.id, code: section.subject_code, reason: 'Section is full' });
                    continue;
                }

                // Register
                await query(`
                    INSERT INTO registrations (student_id, section_id, registration_type)
                    VALUES ($1, $2, 'normal')
                `, [studentId, section.id]);

                // Update enrolled count
                await query(`
                    UPDATE sections SET enrolled_count = enrolled_count + 1 WHERE id = $1
                `, [section.id]);

                successes.push({ sectionId: section.id, code: section.subject_code });
            } catch (regError) {
                errors.push({ sectionId: section.id, code: section.subject_code, reason: regError.message });
            }
        }

        res.json({
            success: true,
            data: {
                registered: successes,
                failed: errors,
                totalRequested: sectionIds.length,
                totalRegistered: successes.length
            }
        });
    } catch (error) {
        console.error('Bulk register error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// PROGRAMME & LECTURER SCHEDULES (from sections table, NOT raw aSC)
// ============================================================================

/**
 * GET /api/student/classes
 * Get list of unique classes (timetable_groups) from sections
 */
router.get('/classes', async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT timetable_group as id, timetable_group as name
            FROM sections
            WHERE timetable_group IS NOT NULL 
              AND timetable_group != ''
              AND is_active = true
            ORDER BY timetable_group
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/student/classes/:classId/schedule
 * Get schedule for a specific class (timetable_group)
 */
router.get('/classes/:classId/schedule', async (req, res) => {
    try {
        const classId = decodeURIComponent(req.params.classId);

        const result = await query(`
            SELECT 
                sec.id,
                sec.section_number,
                sec.day,
                sec.start_time,
                sec.end_time,
                sec.room,
                sec.timetable_group,
                sub.code as subject_code,
                sub.name as subject_name,
                u.lecturer_name
            FROM sections sec
            JOIN subjects sub ON sec.subject_id = sub.id
            LEFT JOIN users u ON sec.lecturer_id = u.id
            WHERE sec.timetable_group = $1 AND sec.is_active = true
            ORDER BY sec.day, sec.start_time
        `, [classId]);

        let sections = result.rows;

        // Fetch schedules from section_schedules table
        if (sections.length > 0) {
            const sectionIds = [...new Set(sections.map(s => s.id))];
            const schedulesResult = await query(
                `SELECT * FROM section_schedules WHERE section_id = ANY($1) ORDER BY section_id, day, start_time`,
                [sectionIds]
            );

            const schedulesBySection = {};
            for (const schedule of schedulesResult.rows) {
                if (!schedulesBySection[schedule.section_id]) {
                    schedulesBySection[schedule.section_id] = [];
                }
                schedulesBySection[schedule.section_id].push(schedule);
            }

            // Expand sections by their schedules (one entry per schedule slot)
            const expandedSections = [];
            for (const section of sections) {
                const schedules = schedulesBySection[section.id] || [];
                if (schedules.length > 0) {
                    schedules.forEach(sched => {
                        expandedSections.push({
                            ...section,
                            day: sched.day,
                            start_time: sched.start_time,
                            end_time: sched.end_time,
                            room: sched.room || section.room
                        });
                    });
                } else {
                    expandedSections.push(section);
                }
            }
            sections = expandedSections;
        }

        res.json({
            success: true,
            data: {
                classId,
                sections
            }
        });
    } catch (error) {
        console.error('Get class schedule error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/student/lecturers
 * Get list of unique lecturers from sections
 */
router.get('/lecturers', async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT u.id, u.lecturer_name as name, u.email
            FROM sections sec
            JOIN users u ON sec.lecturer_id = u.id
            WHERE sec.is_active = true
              AND u.lecturer_name IS NOT NULL
            ORDER BY u.lecturer_name
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get lecturers error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/student/lecturers/:lecturerId/schedule
 * Get schedule for a specific lecturer
 */
router.get('/lecturers/:lecturerId/schedule', async (req, res) => {
    try {
        const lecturerId = req.params.lecturerId;

        const result = await query(`
            SELECT 
                sec.id,
                sec.section_number,
                sec.day,
                sec.start_time,
                sec.end_time,
                sec.room,
                sec.timetable_group,
                sub.code as subject_code,
                sub.name as subject_name
            FROM sections sec
            JOIN subjects sub ON sec.subject_id = sub.id
            WHERE sec.lecturer_id = $1 AND sec.is_active = true
            ORDER BY sec.day, sec.start_time
        `, [lecturerId]);

        let sections = result.rows;

        // Fetch schedules from section_schedules table
        if (sections.length > 0) {
            const sectionIds = [...new Set(sections.map(s => s.id))];
            const schedulesResult = await query(
                `SELECT * FROM section_schedules WHERE section_id = ANY($1) ORDER BY section_id, day, start_time`,
                [sectionIds]
            );

            const schedulesBySection = {};
            for (const schedule of schedulesResult.rows) {
                if (!schedulesBySection[schedule.section_id]) {
                    schedulesBySection[schedule.section_id] = [];
                }
                schedulesBySection[schedule.section_id].push(schedule);
            }

            // Expand sections by their schedules
            const expandedSections = [];
            for (const section of sections) {
                const schedules = schedulesBySection[section.id] || [];
                if (schedules.length > 0) {
                    schedules.forEach(sched => {
                        expandedSections.push({
                            ...section,
                            day: sched.day,
                            start_time: sched.start_time,
                            end_time: sched.end_time,
                            room: sched.room || section.room
                        });
                    });
                } else {
                    expandedSections.push(section);
                }
            }
            sections = expandedSections;
        }

        res.json({
            success: true,
            data: {
                lecturerId,
                sections
            }
        });
    } catch (error) {
        console.error('Get lecturer schedule error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;


