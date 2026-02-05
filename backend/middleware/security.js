const crypto = require('crypto');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

// ============================================================================
// SHA-256 HASHING
// ============================================================================

/**
 * Hash user identifier with SHA-256 for audit logging
 * @param {string} userId - User UUID or identifier
 * @returns {string} - SHA-256 hash
 */
const hashUserId = (userId) => {
    return crypto
        .createHash('sha256')
        .update(userId.toString())
        .digest('hex');
};

// ============================================================================
// AES-256 ENCRYPTION
// ============================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 64 hex characters (32 bytes)
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData
 */
const encrypt = (text) => {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        throw new Error('Invalid encryption key. Must be 64 hex characters.');
    }

    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt AES-256-CBC encrypted data
 * @param {string} encryptedText - Encrypted text in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedText) => {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        throw new Error('Invalid encryption key. Must be 64 hex characters.');
    }

    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

// ============================================================================
// RECAPTCHA V3 VERIFICATION
// ============================================================================

/**
 * Verify reCAPTCHA v3 token
 * @param {string} token - reCAPTCHA token from client
 * @param {string} expectedAction - Expected action name
 * @returns {Promise<Object>} - Verification result with score
 */
const verifyRecaptcha = async (token, expectedAction = 'submit') => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5;

    if (!secretKey) {
        console.warn('reCAPTCHA secret key not configured');
        return { success: true, score: 1.0 }; // Allow in development
    }

    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: secretKey,
                    response: token
                }
            }
        );

        const { success, score, action, 'error-codes': errorCodes } = response.data;

        if (!success) {
            return {
                success: false,
                error: 'reCAPTCHA verification failed',
                errorCodes
            };
        }

        if (action !== expectedAction) {
            return {
                success: false,
                error: `Invalid action. Expected ${expectedAction}, got ${action}`
            };
        }

        if (score < minScore) {
            return {
                success: false,
                error: `reCAPTCHA score too low: ${score} (minimum: ${minScore})`,
                score
            };
        }

        return {
            success: true,
            score,
            action
        };

    } catch (error) {
        console.error('reCAPTCHA verification error:', error.message);
        return {
            success: false,
            error: 'reCAPTCHA verification service error'
        };
    }
};

/**
 * Express middleware for reCAPTCHA verification
 */
const recaptchaMiddleware = (expectedAction = 'submit') => {
    return async (req, res, next) => {
        const token = req.body.recaptchaToken || req.headers['x-recaptcha-token'];

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'reCAPTCHA token is required'
            });
        }

        const result = await verifyRecaptcha(token, expectedAction);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error || 'reCAPTCHA verification failed'
            });
        }

        req.recaptchaScore = result.score;
        next();
    };
};

// ============================================================================
// BRUTE FORCE PROTECTION
// ============================================================================

// In-memory store for failed login attempts (use Redis in production)
const loginAttempts = new Map();

/**
 * Track failed login attempt
 * @param {string} identifier - IP address or email
 */
const trackFailedLogin = (identifier) => {
    const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: Date.now() };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(identifier, attempts);

    // Clean up old entries (older than lockout duration)
    const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MS) || 900000; // 15 minutes
    if (Date.now() - attempts.firstAttempt > lockoutDuration) {
        loginAttempts.delete(identifier);
    }
};

/**
 * Reset login attempts on successful login
 * @param {string} identifier - IP address or email
 */
const resetLoginAttempts = (identifier) => {
    loginAttempts.delete(identifier);
};

/**
 * Check if identifier is locked out
 * @param {string} identifier - IP address or email
 * @returns {Object} - Lock status and remaining time
 */
const checkLockout = (identifier) => {
    const attempts = loginAttempts.get(identifier);
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MS) || 900000;

    if (!attempts) {
        return { isLocked: false };
    }

    if (attempts.count >= maxAttempts) {
        const timeSinceFirst = Date.now() - attempts.firstAttempt;
        if (timeSinceFirst < lockoutDuration) {
            const remainingTime = Math.ceil((lockoutDuration - timeSinceFirst) / 1000 / 60);
            return {
                isLocked: true,
                remainingMinutes: remainingTime,
                attempts: attempts.count
            };
        } else {
            // Lockout expired
            loginAttempts.delete(identifier);
            return { isLocked: false };
        }
    }

    return { isLocked: false, attempts: attempts.count };
};

/**
 * Middleware to check for brute force attacks
 */
const bruteForceProtection = (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const lockStatus = checkLockout(identifier);

    if (lockStatus.isLocked) {
        return res.status(429).json({
            success: false,
            message: `Too many failed login attempts. Please try again in ${lockStatus.remainingMinutes} minutes.`,
            remainingMinutes: lockStatus.remainingMinutes
        });
    }

    req.loginAttempts = lockStatus.attempts || 0;
    next();
};

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
    },
    skipSuccessfulRequests: true
});

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;

    return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
};

/**
 * Middleware to sanitize all request inputs
 */
const sanitizeRequestInputs = (req, res, next) => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        });
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeInput(req.query[key]);
            }
        });
    }

    next();
};

// ============================================================================
// SUSPICIOUS ACTIVITY DETECTION
// ============================================================================

/**
 * Detect suspicious patterns in requests
 * @param {Object} req - Express request object
 * @returns {Object} - Detection result
 */
const detectSuspiciousActivity = (req) => {
    const suspiciousPatterns = [
        // SQL injection patterns
        /(\bor\b|\band\b).*=.*\d/i,
        /union.*select/i,
        /drop\s+table/i,
        /insert\s+into/i,
        /delete\s+from/i,

        // Path traversal
        /\.\.\//,
        /\.\.\\/,

        // XSS patterns
        /<script/i,
        /javascript:/i,
        /onerror=/i,
        /onclick=/i
    ];

    const requestString = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params
    });

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestString)) {
            return {
                isSuspicious: true,
                reason: `Matched suspicious pattern: ${pattern}`,
                pattern: pattern.toString()
            };
        }
    }

    return { isSuspicious: false };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Hashing and encryption
    hashUserId,
    encrypt,
    decrypt,

    // reCAPTCHA
    verifyRecaptcha,
    recaptchaMiddleware,

    // Brute force protection
    trackFailedLogin,
    resetLoginAttempts,
    checkLockout,
    bruteForceProtection,

    // Rate limiting
    generalLimiter,
    authLimiter,

    // Input sanitization
    sanitizeInput,
    sanitizeRequestInputs,

    // Suspicious activity detection
    detectSuspiciousActivity
};
