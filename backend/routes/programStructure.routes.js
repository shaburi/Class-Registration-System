/**
 * Program Structure Routes
 * Manages intake-based program structures with Excel import support
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { authenticate, requireRole } = require('../middleware/auth');
const { query } = require('../database/connection');
const programStructureService = require('../services/programStructure.service');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Programme list
const PROGRAMMES = [
    { code: 'CT206', name: 'Bachelor of Computer Science (Software Engineering)' },
    { code: 'CT204', name: 'Bachelor of Computer Science (Computer Security)' }
];

/**
 * GET /api/program-structures
 * Get all structures for a programme
 */
router.get('/', authenticate, requireRole('hop'), async (req, res) => {
    try {
        const { programme } = req.query;
        if (!programme) {
            return res.status(400).json({ success: false, message: 'Programme is required' });
        }

        const structures = await programStructureService.getStructuresForProgramme(programme);
        res.json({ success: true, data: structures });
    } catch (error) {
        console.error('Error fetching structures:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/program-structures/subject-mapping
 * Get a mapping of subject_code -> [programmes] from all active program structures
 */
router.get('/subject-mapping', authenticate, requireRole('hop'), async (req, res) => {
    try {
        const mapping = await programStructureService.getSubjectProgrammeMapping();
        res.json({ success: true, data: mapping });
    } catch (error) {
        console.error('Error fetching subject-programme mapping:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/program-structures/:id
 * Get a specific structure with its courses
 */
router.get('/:id', authenticate, requireRole('hop'), async (req, res) => {
    try {
        const structure = await programStructureService.getStructureWithCourses(req.params.id);
        if (!structure) {
            return res.status(404).json({ success: false, message: 'Structure not found' });
        }
        res.json({ success: true, data: structure });
    } catch (error) {
        console.error('Error fetching structure:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/program-structures
 * Create a new program structure
 */
router.post('/', authenticate, requireRole('hop'), async (req, res) => {
    try {
        const { programme, intake_type, effective_year, name } = req.body;

        if (!programme || !intake_type) {
            return res.status(400).json({ success: false, message: 'Programme and intake_type are required' });
        }

        const structure = await programStructureService.createStructure(
            programme,
            intake_type,
            effective_year || new Date().getFullYear(),
            name,
            req.user.id
        );

        res.json({ success: true, data: structure });
    } catch (error) {
        console.error('Error creating structure:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/program-structures/:id
 * Delete a structure
 */
router.delete('/:id', authenticate, requireRole('hop'), async (req, res) => {
    try {
        await programStructureService.deleteStructure(req.params.id);
        res.json({ success: true, message: 'Structure deleted' });
    } catch (error) {
        console.error('Error deleting structure:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/program-structures/:id/toggle
 * Toggle structure active status
 */
router.put('/:id/toggle', authenticate, requireRole('hop'), async (req, res) => {
    try {
        const { is_active } = req.body;
        const structure = await programStructureService.toggleStructureActive(req.params.id, is_active);
        res.json({ success: true, data: structure });
    } catch (error) {
        console.error('Error toggling structure:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/program-structures/import-excel
 * Import program structure from Excel file
 * Supports: Multi-language sheet names (English/Bahasa), smart column detection, auto-create subjects
 */
router.post('/import-excel', authenticate, requireRole('hop'), upload.single('file'), async (req, res) => {
    try {
        const { programme, effective_year } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Excel file is required' });
        }

        if (!programme || !effective_year) {
            return res.status(400).json({
                success: false,
                message: 'programme and effective_year are required'
            });
        }

        console.log('[EXCEL IMPORT] Processing file:', req.file.originalname);

        // Parse Excel file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const results = {
            structures: [],
            totalCourses: 0,
            missingSubjects: [],
            createdSubjects: [],
            errors: [],
            sheetNames: workbook.SheetNames
        };
        console.log('[EXCEL IMPORT] Sheet names in workbook:', workbook.SheetNames);

        // Map sheet names to intake types - supports English and Bahasa variations
        const sheetToIntake = {
            // English variations
            'structure may': 'may', 'may': 'may', 'mei': 'may',
            'structure aug': 'august', 'august': 'august', 'aug': 'august',
            'structure dec': 'december', 'december': 'december', 'dec': 'december',
            // Bahasa Malaysia variations
            'struktur mei': 'may', 'session mei': 'may', 'sesi mei': 'may',
            'struktur ogos': 'august', 'session ogos': 'august', 'sesi ogos': 'august', 'ogos': 'august',
            'struktur dis': 'december', 'struktur disember': 'december', 'session dis': 'december',
            'sesi dis': 'december', 'sesi disember': 'december', 'dis': 'december', 'disember': 'december'
        };

        // Function to detect intake from sheet name using patterns
        const detectIntake = (sheetName) => {
            const lower = sheetName.trim().toLowerCase();

            // First try exact match
            if (sheetToIntake[lower]) return sheetToIntake[lower];

            // Then try pattern matching (e.g., "Ogos 2024", "Session Mei 2025")
            if (lower.includes('may') || lower.includes('mei')) return 'may';
            if (lower.includes('aug') || lower.includes('ogos')) return 'august';
            if (lower.includes('dec') || lower.includes('dis')) return 'december';

            return null;
        };

        // Get all existing subjects for lookup (by code, regardless of programme)
        const subjectsResult = await query('SELECT id, code, name FROM subjects');
        const subjectMap = {};
        for (const sub of subjectsResult.rows) {
            subjectMap[sub.code.toUpperCase()] = sub;
        }
        console.log('[EXCEL IMPORT] Subject map has', Object.keys(subjectMap).length, 'subjects');

        // Process each sheet
        for (const sheetName of workbook.SheetNames) {
            const intakeType = detectIntake(sheetName);
            if (!intakeType) {
                console.log('[EXCEL IMPORT] Skipping unrecognized sheet:', sheetName);
                continue;
            }

            console.log('[EXCEL IMPORT] Processing sheet:', sheetName, '-> intake:', intakeType);
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            // Parse courses from this sheet
            const courses = [];
            let currentSemester = 0;

            // Smart column detection - find header row and map columns
            let columnMap = { code: 0, name: 1, credit: 3, status: 2, prereq: 4 }; // Default
            for (let i = 0; i < Math.min(data.length, 10); i++) {
                const row = data[i];
                if (!row) continue;
                const rowStr = row.map(c => String(c || '').toLowerCase()).join('|');
                if (rowStr.includes('course code') || rowStr.includes('kod subjek')) {
                    // Found header row - detect column positions
                    for (let j = 0; j < row.length; j++) {
                        const cell = String(row[j] || '').toLowerCase();
                        if (cell.includes('course code') || cell.includes('kod subjek') || cell === 'code') columnMap.code = j;
                        else if (cell.includes('course name') || cell.includes('nama subjek') || cell === 'name') columnMap.name = j;
                        else if (cell.includes('credit') || cell.includes('kredit')) columnMap.credit = j;
                        else if (cell.includes('status')) columnMap.status = j;
                        else if (cell.includes('pre-req') || cell.includes('prereq') || cell.includes('prasyarat')) columnMap.prereq = j;
                    }
                    console.log('[EXCEL IMPORT] Detected columns:', columnMap);
                    break;
                }
            }

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                // Debug log first 20 rows
                if (i < 20) {
                    console.log(`[EXCEL IMPORT] Row ${i}:`, row.slice(0, 6).map(c => String(c || '').substring(0, 30)));
                }

                // Check all cells for semester header (handles merged cells)
                let foundSemester = false;
                for (const cellVal of row) {
                    if (!cellVal) continue;
                    const cellStr = String(cellVal).trim();

                    // Try multiple semester patterns
                    // Pattern 1: "SEMESTER 1 / YEAR 1" or "SEMESTER 1/YEAR 1"
                    let semesterMatch = cellStr.match(/SEMESTER\s*(\d+)\s*[\/\s]+YEAR\s*(\d+)/i);
                    if (semesterMatch) {
                        const semNum = parseInt(semesterMatch[1]);
                        const yearNum = parseInt(semesterMatch[2]);
                        currentSemester = (yearNum - 1) * 3 + semNum; // Trimester: 3 semesters per year
                        console.log('[EXCEL IMPORT] Found semester header (pattern 1):', cellStr, '-> semester', currentSemester);
                        foundSemester = true;
                        break;
                    }

                    // Pattern 2: Just "SEMESTER 1" or "SEM 1"
                    semesterMatch = cellStr.match(/^(?:SEMESTER|SEM)\s*(\d+)$/i);
                    if (semesterMatch) {
                        currentSemester = parseInt(semesterMatch[1]);
                        console.log('[EXCEL IMPORT] Found semester header (pattern 2):', cellStr, '-> semester', currentSemester);
                        foundSemester = true;
                        break;
                    }

                    // Pattern 3: "YEAR 1 SEMESTER 1" or similar
                    semesterMatch = cellStr.match(/YEAR\s*(\d+)\s*[,\-\/\s]+SEMESTER\s*(\d+)/i);
                    if (semesterMatch) {
                        const yearNum = parseInt(semesterMatch[1]);
                        const semNum = parseInt(semesterMatch[2]);
                        currentSemester = (yearNum - 1) * 3 + semNum;
                        console.log('[EXCEL IMPORT] Found semester header (pattern 3):', cellStr, '-> semester', currentSemester);
                        foundSemester = true;
                        break;
                    }
                }
                if (foundSemester) continue;

                // Skip header rows and total rows
                const firstCell = String(row[columnMap.code] || '').trim().toUpperCase();
                if (firstCell === 'COURSE CODE' || firstCell === 'CODE' || firstCell === 'TOTAL' || firstCell === '' || firstCell === '#') continue;

                // Parse course row - handle alternatives like "UCS3143 / UCS3153 / UCS3163"
                // Parse course row - handle alternatives like "UCS3143 / UCS3153 / UCS3163"
                const rawCode = String(row[columnMap.code] || '').trim();
                const rawName = String(row[columnMap.name] || '').trim();

                // Split code by "/" or newline to finding multiple codes
                const potentialCodes = rawCode.split(/[\/\n]+/).map(c => c.trim()).filter(c => c.length > 0);

                const validCourses = [];
                // Try to split names too, to match the codes if possible
                const potentialNames = rawName.split(/[\/\n]+/).map(n => n.trim()).filter(n => n.length > 0);

                for (let k = 0; k < potentialCodes.length; k++) {
                    const rawPart = potentialCodes[k];
                    // Extract clean code
                    const codeMatch = rawPart.match(/([A-Z]{2,4}\d{3,4})/i);

                    if (codeMatch) {
                        const cleanCode = codeMatch[1].toUpperCase();

                        // Determine name: use corresponding split name, or fallback to full name
                        let cleanName = rawName;
                        if (potentialNames.length >= potentialCodes.length) {
                            cleanName = potentialNames[k];
                        } else if (potentialNames.length > 0) {
                            // If unmatched (e.g. 3 codes, 1 name), use the full name or first part
                            cleanName = rawName.replace(/\//g, ' / '); // make it readable
                        }

                        validCourses.push({
                            code: cleanCode,
                            name: cleanName,
                        });
                    }
                }

                if (validCourses.length === 0) continue;

                const creditHours = parseInt(row[columnMap.credit]) || 3;
                const status = String(row[columnMap.status] || 'Core Computing').trim();
                const prereq = String(row[columnMap.prereq] || '').trim();

                // Only add if we have a valid semester
                if (currentSemester > 0) {
                    validCourses.forEach(c => {
                        courses.push({
                            code: c.code,
                            name: c.name,
                            semester: currentSemester,
                            status: status,
                            credit_hours: creditHours,
                            prerequisite: prereq !== 'None' && prereq !== '' ? prereq : null
                        });
                    });
                }
            }

            if (courses.length === 0) {
                results.errors.push(`No courses found in sheet: ${sheetName}`);
                console.log('[EXCEL IMPORT] ERROR: No courses found in sheet', sheetName);
                continue;
            }

            console.log('[EXCEL IMPORT] Found', courses.length, 'courses in', sheetName);

            // Create or update structure
            const structure = await programStructureService.createStructure(
                programme,
                intakeType,
                parseInt(effective_year),
                `${programme} ${intakeType} ${effective_year}`,
                req.user.id
            );

            // Add courses to structure (auto-create missing subjects)
            const coursesToAdd = [];
            const createdSubjects = [];

            for (const course of courses) {
                let subject = subjectMap[course.code];

                // Always create or update subject to ensure we have the latest name/details
                try {
                    const insertResult = await query(`
                        INSERT INTO subjects (code, name, credit_hours, programme, semester, is_active)
                        VALUES ($1, $2, $3, $4, $5, true)
                        ON CONFLICT (code) DO UPDATE SET 
                            name = EXCLUDED.name,
                            credit_hours = EXCLUDED.credit_hours
                        RETURNING id, code, name
                    `, [course.code, course.name, course.credit_hours, programme, course.semester]);

                    subject = insertResult.rows[0];
                    subjectMap[course.code] = subject;
                    if (!subjectMap[course.code]) createdSubjects.push({ code: course.code, name: course.name });
                } catch (err) {
                    results.errors.push(`Failed to upsert subject ${course.code}: ${err.message}`);
                    if (!subject) continue;
                }

                coursesToAdd.push({
                    subject_id: subject.id,
                    semester: course.semester,
                    status: course.status,
                    prerequisite_codes: course.prerequisite ? [course.prerequisite] : []
                });
            }

            // Track created subjects in results
            if (createdSubjects.length > 0) {
                results.createdSubjects.push(...createdSubjects);
            }

            console.log('[EXCEL IMPORT] Matched', coursesToAdd.length, 'courses');

            if (coursesToAdd.length === 0) {
                results.errors.push(`No valid courses to add for ${sheetName}`);
                continue;
            }

            const addResult = await programStructureService.bulkAddCourses(structure.id, coursesToAdd);

            results.structures.push({
                intake_type: intakeType,
                structure_id: structure.id,
                coursesAdded: addResult.added,
                coursesUpdated: addResult.updated,
                errors: addResult.errors
            });

            results.totalCourses += addResult.added + addResult.updated;
        }

        res.json({
            success: true,
            message: `Imported ${results.totalCourses} courses into ${results.structures.length} structure(s).`,
            data: results
        });

    } catch (error) {
        console.error('[EXCEL IMPORT] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
