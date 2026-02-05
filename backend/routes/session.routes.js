const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const sessionService = require('../services/session.service');

// HOP only middleware
const hopOnly = requireRole('hop');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/sessions
 * Get all sessions
 */
router.get('/', async (req, res) => {
    try {
        const sessions = await sessionService.getAllSessions();
        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('[SESSIONS] Error fetching sessions:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/active
 * Get the currently active session
 */
router.get('/active', async (req, res) => {
    try {
        const session = await sessionService.getActiveSession();
        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('[SESSIONS] Error fetching active session:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const session = await sessionService.getSessionById(req.params.id);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('[SESSIONS] Error fetching session:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:id/stats
 * Get session statistics
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const stats = await sessionService.getSessionStats(req.params.id);
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('[SESSIONS] Error fetching session stats:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// HOP-only routes below
// ============================================================================

/**
 * POST /api/sessions
 * Create a new session (HOP only)
 * Optional: clone_from_session_id to copy sections from another session
 */
router.post('/', hopOnly, async (req, res) => {
    try {
        const { code, name, start_date, end_date, status, is_registration_open, clone_from_session_id } = req.body;

        if (!code || !name) {
            return res.status(400).json({
                success: false,
                message: 'Code and name are required'
            });
        }

        const result = await sessionService.createAndCloneSession({
            code,
            name,
            start_date,
            end_date,
            status,
            is_registration_open
        }, clone_from_session_id);

        let message = 'Session created successfully';
        if (result.cloneResult) {
            message += `. Cloned ${result.cloneResult.clonedSections} of ${result.cloneResult.totalSections} sections.`;
        }

        res.status(201).json({
            success: true,
            message,
            data: result.session,
            cloneResult: result.cloneResult
        });
    } catch (error) {
        console.error('[SESSIONS] Error creating session:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PUT /api/sessions/:id
 * Update a session (HOP only)
 */
router.put('/:id', hopOnly, async (req, res) => {
    try {
        const { name, start_date, end_date, status, is_registration_open } = req.body;

        const session = await sessionService.updateSession(req.params.id, {
            name,
            start_date,
            end_date,
            status,
            is_registration_open
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            message: 'Session updated successfully',
            data: session
        });
    } catch (error) {
        console.error('[SESSIONS] Error updating session:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PUT /api/sessions/:id/activate
 * Activate a session (archives all others) (HOP only)
 */
router.put('/:id/activate', hopOnly, async (req, res) => {
    try {
        const session = await sessionService.activateSession(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            message: 'Session activated successfully. All other sessions have been archived.',
            data: session
        });
    } catch (error) {
        console.error('[SESSIONS] Error activating session:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PUT /api/sessions/:id/archive
 * Archive a session (HOP only)
 */
router.put('/:id/archive', hopOnly, async (req, res) => {
    try {
        const session = await sessionService.archiveSession(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            message: 'Session archived successfully',
            data: session
        });
    } catch (error) {
        console.error('[SESSIONS] Error archiving session:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/sessions/:id
 * Delete a session (only if no linked data) (HOP only)
 */
router.delete('/:id', hopOnly, async (req, res) => {
    try {
        await sessionService.deleteSession(req.params.id);

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });
    } catch (error) {
        console.error('[SESSIONS] Error deleting session:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
