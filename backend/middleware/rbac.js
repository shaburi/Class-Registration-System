/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission checks based on user roles
 */

/**
 * Require specific role(s) to access endpoint
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Convert to array if single role provided
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${roles.join(', ')}`,
                userRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Check if user owns the resource (for students)
 * Prevents students from modifying other students' data
 * @param {string} resourceIdParam - Request parameter name containing resource ID
 * @param {string} ownerField - Database field name for owner ID (default: 'student_id')
 */
const requireOwnership = (resourceIdParam = 'id', ownerField = 'student_id') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // HOP and admins bypass ownership checks
        if (req.user.role === 'hop') {
            return next();
        }

        // For students, verify ownership
        if (req.user.role === 'student') {
            const resourceId = req.params[resourceIdParam];

            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Resource ID not provided'
                });
            }

            // The resource verification happens in the route handler
            // This middleware just ensures the user is authenticated
            // Actual ownership check is done in service layer
            req.ownershipCheck = {
                resourceId,
                ownerField,
                userId: req.user.id
            };
        }

        next();
    };
};

/**
 * Check if lecturer has access to specific subject/section
 * Lecturers can only access sections assigned to them
 */
const requireLecturerAccess = () => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // HOP bypasses this check
        if (req.user.role === 'hop') {
            return next();
        }

        // Lecturers need verification in route handler
        if (req.user.role === 'lecturer') {
            req.lecturerCheck = {
                lecturerId: req.user.id
            };
        }

        next();
    };
};

/**
 * Combine multiple permission checks with OR logic
 * User needs to pass at least ONE check
 * @param  {...Function} middlewares - Permission check middlewares
 */
const anyOf = (...middlewares) => {
    return async (req, res, next) => {
        let lastError = null;

        for (const middleware of middlewares) {
            try {
                await new Promise((resolve, reject) => {
                    middleware(req, res, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                // If middleware passed, continue
                return next();
            } catch (error) {
                lastError = error;
                continue;
            }
        }

        // All middlewares failed
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            error: lastError?.message
        });
    };
};

/**
 * Combine multiple permission checks with AND logic
 * User needs to pass ALL checks
 * @param  {...Function} middlewares - Permission check middlewares
 */
const allOf = (...middlewares) => {
    return async (req, res, next) => {
        for (const middleware of middlewares) {
            try {
                await new Promise((resolve, reject) => {
                    middleware(req, res, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } catch (error) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    error: error.message
                });
            }
        }
        next();
    };
};

/**
 * Permission matrix for common operations
 */
const permissions = {
    // Student permissions
    canRegisterForSection: requireRole('student'),
    canViewOwnRegistrations: requireRole('student'),
    canCreateSwapRequest: requireRole('student'),
    canRespondToSwapRequest: requireRole('student'),
    canRequestManualJoin: requireRole('student'),

    // Lecturer permissions
    canViewAssignedSections: requireRole(['lecturer', 'hop']),
    canApproveSwapRequest: requireRole(['lecturer', 'hop']),
    canApproveManualJoin: requireRole(['lecturer', 'hop']),

    // HOP permissions
    canManageSubjects: requireRole('hop'),
    canManageSections: requireRole('hop'),
    canAssignLecturers: requireRole('hop'),
    canOverrideRegistrations: requireRole('hop'),
    canExportData: requireRole('hop'),
    canViewAllRequests: requireRole('hop'),

    // Shared permissions
    canViewTimetable: requireRole(['student', 'lecturer', 'hop'])
};

/**
 * Check if user has permission to approve request
 * @param {string} requestType - 'swap' or 'manual_join'
 */
const canApproveRequest = (requestType) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // HOP can approve any request
        if (req.user.role === 'hop') {
            return next();
        }

        // Lecturers can approve requests for their sections
        // This is verified in the service layer
        if (req.user.role === 'lecturer') {
            req.approvalCheck = {
                lecturerId: req.user.id,
                requestType
            };
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Only lecturers and Head of Programme can approve requests'
        });
    };
};

/**
 * Validate semester access for students
 * Students can only register for subjects in their current semester
 */
const validateSemesterAccess = () => {
    return (req, res, next) => {
        if (req.user.role !== 'student') {
            return next();
        }

        if (!req.user.semester) {
            return res.status(400).json({
                success: false,
                message: 'Student semester information not found'
            });
        }

        req.semesterCheck = {
            semester: req.user.semester,
            programme: req.user.programme
        };

        next();
    };
};

module.exports = {
    requireRole,
    requireOwnership,
    requireLecturerAccess,
    anyOf,
    allOf,
    permissions,
    canApproveRequest,
    validateSemesterAccess
};
