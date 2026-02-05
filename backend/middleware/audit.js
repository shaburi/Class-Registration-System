const { query } = require('../database/connection');
const { hashUserId, encrypt, detectSuspiciousActivity } = require('./security');

/**
 * Audit logging middleware
 * Logs all incoming requests with user information and security analysis
 */
const auditLogger = async (req, res, next) => {
    // Store original json method to capture response
    const originalJson = res.json.bind(res);

    // Capture response data
    res.json = function (data) {
        res.locals.responseData = data;
        return originalJson(data);
    };

    // Capture request start time
    const startTime = Date.now();

    // Listen for response finish event
    res.on('finish', async () => {
        try {
            // Extract user information from request (set by auth middleware)
            const userId = req.user?.id;
            const userRole = req.user?.role;

            // Hash user ID for privacy
            const userIdHash = userId ? hashUserId(userId) : hashUserId(req.ip);

            // Get IP address
            const ipAddress = req.ip ||
                req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress;

            // Detect suspicious activity
            const suspiciousCheck = detectSuspiciousActivity(req);

            // Determine action type from route and method
            const actionType = determineActionType(req);

            // Encrypt sensitive request body (exclude passwords, tokens)
            const sanitizedBody = sanitizeBodyForLogging(req.body);
            const encryptedBody = Object.keys(sanitizedBody).length > 0
                ? encrypt(JSON.stringify(sanitizedBody))
                : null;

            // Insert audit log
            await query(`
                INSERT INTO audit_logs (
                    user_id_hash,
                    user_role,
                    ip_address,
                    user_agent,
                    action_type,
                    resource_type,
                    resource_id,
                    request_method,
                    request_path,
                    request_body_encrypted,
                    response_status,
                    is_suspicious,
                    suspicious_reason
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                userIdHash,
                userRole || null,
                ipAddress,
                req.get('user-agent') || '',
                actionType,
                extractResourceType(req.path),
                req.params.id || req.params.sectionId || req.params.registrationId || null,
                req.method,
                req.originalUrl,
                encryptedBody,
                res.statusCode,
                suspiciousCheck.isSuspicious,
                suspiciousCheck.reason || null
            ]);

            // Log to console in development
            if (process.env.NODE_ENV === 'development') {
                const duration = Date.now() - startTime;
                console.log(`[AUDIT] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - User: ${userId || 'anonymous'}`);

                if (suspiciousCheck.isSuspicious) {
                    console.warn(`[SECURITY] Suspicious activity detected: ${suspiciousCheck.reason}`);
                }
            }

        } catch (error) {
            // Don't fail the request if audit logging fails
            console.error('Audit logging error:', error.message);
        }
    });

    next();
};

/**
 * Determine action type from request
 * @param {Object} req - Express request object
 * @returns {string} - Action type
 */
const determineActionType = (req) => {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    // Authentication actions
    if (path.includes('/auth/login')) return 'LOGIN';
    if (path.includes('/auth/register')) return 'REGISTER';
    if (path.includes('/auth/logout')) return 'LOGOUT';

    // Registration actions
    if (path.includes('/register') && method === 'POST') return 'REGISTER_SECTION';
    if (path.includes('/register') && method === 'DELETE') return 'UNREGISTER_SECTION';

    // Swap request actions
    if (path.includes('/swap-request') && method === 'POST') return 'CREATE_SWAP_REQUEST';
    if (path.includes('/swap-request') && path.includes('/respond')) return 'RESPOND_SWAP_REQUEST';
    if (path.includes('/swap-request') && path.includes('/approve')) return 'APPROVE_SWAP_REQUEST';
    if (path.includes('/swap-request') && path.includes('/reject')) return 'REJECT_SWAP_REQUEST';

    // Manual join actions
    if (path.includes('/manual-join-request') && method === 'POST') return 'CREATE_MANUAL_JOIN';
    if (path.includes('/manual-join-request') && path.includes('/approve')) return 'APPROVE_MANUAL_JOIN';
    if (path.includes('/manual-join-request') && path.includes('/reject')) return 'REJECT_MANUAL_JOIN';

    // HOP actions
    if (path.includes('/subjects') && method === 'POST') return 'CREATE_SUBJECT';
    if (path.includes('/subjects') && method === 'PUT') return 'UPDATE_SUBJECT';
    if (path.includes('/subjects') && method === 'DELETE') return 'DELETE_SUBJECT';
    if (path.includes('/sections') && method === 'POST') return 'CREATE_SECTION';
    if (path.includes('/sections') && method === 'PUT') return 'UPDATE_SECTION';
    if (path.includes('/sections') && method === 'DELETE') return 'DELETE_SECTION';
    if (path.includes('/assign-lecturer')) return 'ASSIGN_LECTURER';
    if (path.includes('/override')) return 'OVERRIDE_REGISTRATION';
    if (path.includes('/export')) return 'EXPORT_DATA';

    // View actions
    if (method === 'GET' && path.includes('/subjects')) return 'VIEW_SUBJECTS';
    if (method === 'GET' && path.includes('/registrations')) return 'VIEW_REGISTRATIONS';
    if (method === 'GET' && path.includes('/timetable')) return 'VIEW_TIMETABLE';

    return `${method}_${path.split('/')[2] || 'UNKNOWN'}`.toUpperCase();
};

/**
 * Extract resource type from path
 * @param {string} path - Request path
 * @returns {string|null} - Resource type
 */
const extractResourceType = (path) => {
    if (path.includes('/subjects')) return 'subject';
    if (path.includes('/sections')) return 'section';
    if (path.includes('/registrations')) return 'registration';
    if (path.includes('/swap-request')) return 'swap_request';
    if (path.includes('/manual-join-request')) return 'manual_join_request';
    if (path.includes('/users')) return 'user';
    return null;
};

/**
 * Remove sensitive fields from request body before logging
 * @param {Object} body - Request body
 * @returns {Object} - Sanitized body
 */
const sanitizeBodyForLogging = (body) => {
    if (!body || typeof body !== 'object') return {};

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = [
        'password',
        'passwordHash',
        'token',
        'accessToken',
        'refreshToken',
        'recaptchaToken',
        'mfaSecret',
        'apiKey'
    ];

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
};

/**
 * Query audit logs with filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} - Audit log entries
 */
const getAuditLogs = async (filters = {}) => {
    const {
        userId,
        actionType,
        startDate,
        endDate,
        isSuspicious,
        limit = 100,
        offset = 0
    } = filters;

    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    if (userId) {
        whereConditions.push(`user_id_hash = $${paramCount}`);
        params.push(hashUserId(userId));
        paramCount++;
    }

    if (actionType) {
        whereConditions.push(`action_type = $${paramCount}`);
        params.push(actionType);
        paramCount++;
    }

    if (startDate) {
        whereConditions.push(`created_at >= $${paramCount}`);
        params.push(startDate);
        paramCount++;
    }

    if (endDate) {
        whereConditions.push(`created_at <= $${paramCount}`);
        params.push(endDate);
        paramCount++;
    }

    if (isSuspicious !== undefined) {
        whereConditions.push(`is_suspicious = $${paramCount}`);
        params.push(isSuspicious);
        paramCount++;
    }

    const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    params.push(limit, offset);

    const result = await query(`
        SELECT 
            id,
            user_id_hash,
            user_role,
            ip_address,
            action_type,
            resource_type,
            resource_id,
            request_method,
            request_path,
            response_status,
            is_suspicious,
            suspicious_reason,
            created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, params);

    return result.rows;
};

module.exports = {
    auditLogger,
    getAuditLogs,
    determineActionType,
    sanitizeBodyForLogging
};
