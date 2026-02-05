const express = require('express');
const router = express.Router();
const { verifyGoogleToken } = require('../services/google-auth.service');
const { traditionalLogin } = require('../services/traditional-auth.service');

/**
 * POST /api/auth/google
 * Verify Google ID token and authenticate user
 */
router.post('/google', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'ID token is required'
            });
        }

        const result = await verifyGoogleToken(idToken);

        res.json(result);
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Authentication failed'
        });
    }
});

/**
 * POST /api/auth/login
 * Traditional email/password login (for demo accounts)
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await traditionalLogin(email, password);

        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Login failed'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side should clear token)
 */
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/auth/me
 * Get current authenticated user details
 */
router.get('/me', authenticate, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

module.exports = router;
