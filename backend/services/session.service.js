const { query } = require('../database/connection');

/**
 * Get all sessions
 */
async function getAllSessions() {
    const result = await query(`
        SELECT * FROM sessions 
        ORDER BY 
            CASE status 
                WHEN 'active' THEN 1 
                WHEN 'upcoming' THEN 2 
                WHEN 'archived' THEN 3 
            END,
            start_date DESC
    `);
    return result.rows;
}

/**
 * Get active session
 */
async function getActiveSession() {
    const result = await query(`
        SELECT * FROM sessions WHERE status = 'active' LIMIT 1
    `);
    return result.rows[0] || null;
}

/**
 * Get session by ID
 */
async function getSessionById(id) {
    const result = await query('SELECT * FROM sessions WHERE id = $1', [id]);
    return result.rows[0] || null;
}

/**
 * Get session by code
 */
async function getSessionByCode(code) {
    const result = await query('SELECT * FROM sessions WHERE code = $1', [code]);
    return result.rows[0] || null;
}

/**
 * Create a new session
 */
async function createSession(sessionData) {
    const { code, name, start_date, end_date, status = 'upcoming', is_registration_open = false } = sessionData;

    // Check if code already exists
    const existing = await getSessionByCode(code);
    if (existing) {
        throw new Error(`Session with code "${code}" already exists`);
    }

    const result = await query(`
        INSERT INTO sessions (code, name, start_date, end_date, status, is_registration_open)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `, [code, name, start_date, end_date, status, is_registration_open]);

    return result.rows[0];
}

/**
 * Update a session
 */
async function updateSession(id, updates) {
    const { name, start_date, end_date, status, is_registration_open } = updates;

    const result = await query(`
        UPDATE sessions 
        SET name = COALESCE($1, name),
            start_date = COALESCE($2, start_date),
            end_date = COALESCE($3, end_date),
            status = COALESCE($4, status),
            is_registration_open = COALESCE($5, is_registration_open),
            updated_at = NOW()
        WHERE id = $6
        RETURNING *
    `, [name, start_date, end_date, status, is_registration_open, id]);

    return result.rows[0];
}

/**
 * Activate a session (archives all other sessions)
 */
async function activateSession(id) {
    // Archive all currently active sessions
    await query(`UPDATE sessions SET status = 'archived' WHERE status = 'active'`);

    // Activate the specified session
    const result = await query(`
        UPDATE sessions 
        SET status = 'active', is_registration_open = true, updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `, [id]);

    return result.rows[0];
}

/**
 * Archive a session
 */
async function archiveSession(id) {
    const result = await query(`
        UPDATE sessions 
        SET status = 'archived', is_registration_open = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `, [id]);

    return result.rows[0];
}

/**
 * Delete a session (only if no data linked)
 */
async function deleteSession(id) {
    // Check if session has linked data
    const sectionsCount = await query('SELECT COUNT(*) FROM sections WHERE session_id = $1', [id]);
    const registrationsCount = await query('SELECT COUNT(*) FROM registrations WHERE session_id = $1', [id]);

    if (parseInt(sectionsCount.rows[0].count) > 0 || parseInt(registrationsCount.rows[0].count) > 0) {
        throw new Error('Cannot delete session with linked sections or registrations');
    }

    await query('DELETE FROM sessions WHERE id = $1', [id]);
    return true;
}

/**
 * Get session statistics
 */
async function getSessionStats(sessionId) {
    const sectionsResult = await query('SELECT COUNT(*) FROM sections WHERE session_id = $1', [sessionId]);
    const registrationsResult = await query('SELECT COUNT(*) FROM registrations WHERE session_id = $1', [sessionId]);
    const studentsResult = await query(`
        SELECT COUNT(DISTINCT student_id) FROM registrations WHERE session_id = $1
    `, [sessionId]);

    return {
        sections: parseInt(sectionsResult.rows[0].count),
        registrations: parseInt(registrationsResult.rows[0].count),
        students: parseInt(studentsResult.rows[0].count)
    };
}

/**
 * Clone sections from one session to another
 * @param {string} sourceSessionId - Session to copy from
 * @param {string} targetSessionId - Session to copy to
 * @returns {object} - Clone results
 */
async function cloneSections(sourceSessionId, targetSessionId) {
    // Get all sections from source session
    const sectionsResult = await query(`
        SELECT subject_id, section_number, capacity, day, start_time, end_time, room, building, lecturer_id
        FROM sections 
        WHERE session_id = $1 AND is_active = true
    `, [sourceSessionId]);

    const sections = sectionsResult.rows;
    let clonedCount = 0;

    for (const section of sections) {
        try {
            await query(`
                INSERT INTO sections (subject_id, section_number, capacity, day, start_time, end_time, room, building, lecturer_id, session_id, enrolled_count)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0)
            `, [
                section.subject_id,
                section.section_number,
                section.capacity,
                section.day,
                section.start_time,
                section.end_time,
                section.room,
                section.building,
                section.lecturer_id,
                targetSessionId
            ]);
            clonedCount++;
        } catch (err) {
            console.error(`Failed to clone section ${section.section_number}:`, err.message);
        }
    }

    return {
        totalSections: sections.length,
        clonedSections: clonedCount
    };
}

/**
 * Create a new session and optionally clone sections from another session
 */
async function createAndCloneSession(sessionData, sourceSessionId = null) {
    // Create the new session
    const newSession = await createSession(sessionData);

    let cloneResult = null;
    if (sourceSessionId) {
        cloneResult = await cloneSections(sourceSessionId, newSession.id);
    }

    return {
        session: newSession,
        cloneResult
    };
}

module.exports = {
    getAllSessions,
    getActiveSession,
    getSessionById,
    getSessionByCode,
    createSession,
    updateSession,
    activateSession,
    archiveSession,
    deleteSession,
    getSessionStats,
    cloneSections,
    createAndCloneSession
};

