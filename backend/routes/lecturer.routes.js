const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const lecturerService = require('../services/lecturer.service');
const manualJoinService = require('../services/manualJoin.service');

// All lecturer routes require authentication and lecturer/hop role
router.use(authenticate);
router.use((req, res, next) => {
    console.log('[LECTURER ROUTES] Request:', req.method, req.path, 'User:', req.user?.email);
    next();
});
router.use(requireRole(['lecturer', 'hop']));

// ============================================================================
// PROFILE
// ============================================================================

/**
 * GET /api/lecturer/profile
 * Get lecturer profile information
 */
router.get('/profile', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role,
                lecturer_id: req.user.lecturerId,
                lecturer_name: req.user.lecturerName || req.user.lecturer_name
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// SCHEDULE & SECTIONS
// ============================================================================

/**
 * GET /api/lecturer/sections
 * Get all sections assigned to the lecturer
 */
router.get('/sections', async (req, res) => {
    try {
        const sections = await lecturerService.getLecturerSections(req.user.id);

        res.json({
            success: true,
            data: sections
        });
    } catch (error) {
        console.error('[LECTURER] Error fetching sections:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/lecturer/sections/:sectionId/students
 * Get all students in a specific section
 */
router.get('/sections/:sectionId/students', async (req, res) => {
    try {
        const students = await lecturerService.getSectionStudents(
            req.params.sectionId,
            req.user.id
        );

        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('[LECTURER] Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/lecturer/stats
 * Get overall statistics for lecturer
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await lecturerService.getLecturerStats(req.user.id);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('[LECTURER] Error fetching stats:', error);
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
 * GET /api/lecturer/manual-requests/pending
 * Get pending manual join requests for lecturer's sections
 */
router.get('/manual-requests/pending', async (req, res) => {
    try {
        const requests = await manualJoinService.getManualJoinRequestsForLecturer(req.user.id);

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('[LECTURER] Error fetching manual requests:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/lecturer/manual-requests/:requestId/approve
 * Approve a manual join request
 */
router.post('/manual-requests/:requestId/approve', async (req, res) => {
    try {
        const { approval_reason } = req.body;
        const manualJoinService = require('../services/manualJoin.service');

        const result = await manualJoinService.approveManualJoinRequest(
            req.params.requestId,
            req.user.id,
            'lecturer',
            approval_reason
        );

        res.json(result);
    } catch (error) {
        console.error('[LECTURER] Error approving request:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/lecturer/manual-requests/:requestId/reject
 * Reject a manual join request
 */
router.post('/manual-requests/:requestId/reject', async (req, res) => {
    try {
        const { rejection_reason } = req.body;
        const manualJoinService = require('../services/manualJoin.service');

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const result = await manualJoinService.rejectManualJoinRequest(
            req.params.requestId,
            req.user.id,
            'lecturer',
            rejection_reason
        );

        res.json(result);
    } catch (error) {
        console.error('[LECTURER] Error rejecting request:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
