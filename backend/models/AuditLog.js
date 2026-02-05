const crypto = require('crypto');
const { query } = require('../database/connection');

class AuditLog {
    // Create audit log entry
    static async create(logData) {
        const {
            user_id,
            user_role,
            ip_address,
            user_agent,
            action_type,
            resource_type,
            resource_id,
            request_method,
            request_path,
            request_body,
            response_status,
            is_suspicious,
            suspicious_reason
        } = logData;

        // Hash user_id for privacy
        const user_id_hash = user_id
            ? crypto.createHash('sha256').update(user_id).digest('hex')
            : null;

        // Encrypt request body if present (simplified - in production use proper AES-256)
        const request_body_encrypted = request_body
            ? Buffer.from(JSON.stringify(request_body)).toString('base64')
            : null;

        const text = `
            INSERT INTO audit_logs (
                user_id_hash, user_role, ip_address, user_agent,
                action_type, resource_type, resource_id,
                request_method, request_path, request_body_encrypted,
                response_status, is_suspicious, suspicious_reason
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, created_at
        `;

        const values = [
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
            is_suspicious || false,
            suspicious_reason
        ];

        const result = await query(text, values);
        return result.rows[0];
    }

    // Get audit logs with filters
    static async findAll(filters = {}) {
        let text = `
            SELECT 
                id,
                user_role,
                ip_address,
                action_type,
                resource_type,
                request_method,
                request_path,
                response_status,
                is_suspicious,
                suspicious_reason,
                created_at
            FROM audit_logs
            WHERE 1=1
        `;

        const values = [];
        let paramCount = 1;

        if (filters.user_id_hash) {
            text += ` AND user_id_hash = $${paramCount}`;
            const hash = crypto.createHash('sha256').update(filters.user_id_hash).digest('hex');
            values.push(hash);
            paramCount++;
        }

        if (filters.action_type) {
            text += ` AND action_type = $${paramCount}`;
            values.push(filters.action_type);
            paramCount++;
        }

        if (filters.is_suspicious !== undefined) {
            text += ` AND is_suspicious = $${paramCount}`;
            values.push(filters.is_suspicious);
            paramCount++;
        }

        if (filters.start_date) {
            text += ` AND created_at >= $${paramCount}`;
            values.push(filters.start_date);
            paramCount++;
        }

        if (filters.end_date) {
            text += ` AND created_at <= $${paramCount}`;
            values.push(filters.end_date);
            paramCount++;
        }

        text += ' ORDER BY created_at DESC';

        if (filters.limit) {
            text += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
            paramCount++;
        } else {
            text += ' LIMIT 100';
        }

        const result = await query(text, values);
        return result.rows;
    }

    // Get suspicious activities
    static async getSuspicious(limit = 50) {
        const text = `
            SELECT 
                user_role,
                ip_address,
                action_type,
                resource_type,
                request_path,
                suspicious_reason,
                created_at
            FROM audit_logs
            WHERE is_suspicious = true
            ORDER BY created_at DESC
            LIMIT $1
        `;

        const result = await query(text, [limit]);
        return result.rows;
    }

    // Get statistics
    static async getStatistics(startDate, endDate) {
        const text = `
            SELECT 
                COUNT(*) as total_logs,
                COUNT(CASE WHEN is_suspicious THEN 1 END) as suspicious_count,
                COUNT(DISTINCT user_id_hash) as unique_users,
                COUNT(DISTINCT ip_address) as unique_ips,
                json_object_agg(
                    action_type,
                    action_count
                ) as actions_breakdown
            FROM (
                SELECT 
                    user_id_hash,
                    ip_address,
                    action_type,
                    is_suspicious,
                    COUNT(*) as action_count
                FROM audit_logs
                WHERE created_at >= $1 AND created_at <= $2
                GROUP BY user_id_hash, ip_address, action_type, is_suspicious
            ) subquery
        `;

        const result = await query(text, [startDate, endDate]);
        return result.rows[0];
    }
}

module.exports = AuditLog;
