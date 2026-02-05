/**
 * Subject Import Service
 * 
 * Handles importing subjects from various file formats:
 * - CSV (comma-separated values)
 * - XLSX (Excel spreadsheets)
 * - PDF (extracts tables from PDF documents)
 */

const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

class SubjectImportService {
    /**
     * Parse CSV content into subject rows
     * Expected columns: code, name, credit_hours, semester, programme
     */
    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must have a header row and at least one data row');
        }

        // Parse header
        const headerLine = lines[0].toLowerCase();
        const headers = this.parseCSVLine(headerLine);
        
        // Map column indices
        const columnMap = this.mapColumns(headers);
        
        const subjects = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            // Use extractSubjects which handles "/" split codes and returns array
            const extracted = this.extractSubjects(values, columnMap, i + 1);
            subjects.push(...extracted);
        }

        return subjects;
    }

    /**
     * Parse a single CSV line handling quoted values
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    /**
     * Parse XLSX (Excel) file buffer into subject rows
     * Handles files with or without headers
     * Detects "SEMESTER X / YEAR Y" section headers to assign semesters
     */
    parseXLSX(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error('Excel file has no sheets');
        }

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length < 1) {
            throw new Error('Excel sheet is empty');
        }

        // Check if first row looks like a header or data
        const firstRow = data[0];
        const firstRowStr = firstRow.map(v => String(v || '').toLowerCase().trim());
        
        // Detect if first row is a header (contains words like 'code', 'name', 'subject', etc.)
        const hasHeader = firstRowStr.some(h => 
            h.includes('code') || h.includes('name') || h.includes('subject') || 
            h.includes('course') || h.includes('credit') || h.includes('kod') ||
            h.includes('nama') || h.includes('title')
        );

        let columnMap;
        let startRow;

        if (hasHeader) {
            // Parse header
            const headers = firstRowStr;
            columnMap = this.mapColumns(headers);
            startRow = 1;
            logger.info('Excel file has header row');
        } else {
            // No header - assume standard layout: A=code, B=name, C=type, D=credits
            columnMap = {
                code: 0,      // Column A
                name: 1,      // Column B  
                credit_hours: 3, // Column D (skip C which is type)
                semester: -1,
                programme: -1
            };
            startRow = 0;
            logger.info('Excel file has no header - using positional columns: A=code, B=name, D=credits');
        }

        const subjects = [];
        let currentSemester = 1; // Track current semester from section headers
        
        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            const values = row.map(v => String(v || '').trim());
            const firstVal = values[0]?.toUpperCase() || '';
            const rowText = values.join(' ').toUpperCase();
            
            // Check for semester section headers like "SEMESTER 1 / YEAR 1" or "SEMESTER 2 / YEAR 1"
            if (rowText.includes('SEMESTER') && rowText.includes('YEAR')) {
                // Extract semester number from the header
                // Assuming 3 semesters per year:
                // "SEMESTER 1 / YEAR 1" -> 1
                // "SEMESTER 2 / YEAR 1" -> 2
                // "SEMESTER 3 / YEAR 1" -> 3
                // "SEMESTER 1 / YEAR 2" -> 4
                // "SEMESTER 2 / YEAR 2" -> 5
                // "SEMESTER 3 / YEAR 2" -> 6
                // Formula: (year - 1) * 3 + semInYear
                const semMatch = rowText.match(/SEMESTER\s*(\d+)/);
                const yearMatch = rowText.match(/YEAR\s*(\d+)/);
                
                if (semMatch && yearMatch) {
                    const semInYear = parseInt(semMatch[1]);
                    const year = parseInt(yearMatch[1]);
                    currentSemester = (year - 1) * 3 + semInYear;
                    logger.info(`Detected semester section: "${rowText}" -> Semester ${currentSemester}`);
                }
                continue; // Skip this row, it's a header
            }
            
            // Skip rows that are totals, page markers, or empty first column
            if (firstVal === '' || firstVal === 'TOTAL' || firstVal.includes('PAGE') || 
                firstVal.includes('PROGRAM') || firstVal === 'COURSE CODE') {
                continue;
            }
            
            // Use extractSubjects which handles "/" split codes and returns array
            const extracted = this.extractSubjects(values, columnMap, i + 1, currentSemester);
            subjects.push(...extracted);
        }

        logger.info(`Parsed ${subjects.length} subjects from Excel`);
        return subjects;
    }

    /**
     * Parse PDF file buffer into subject rows
     * Attempts to extract tabular data from PDF text
     */
    async parsePDF(buffer) {
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text;

        logger.info(`PDF parsed, ${text.length} characters extracted`);

        // Try to find subject patterns in the text
        // Common patterns: "CT206 Web Programming 3 1" or "CT206, Web Programming, 3, 1"
        const subjects = [];
        const lines = text.split('\n').filter(line => line.trim());

        // First, try to find a header line to understand the format
        let columnMap = null;
        let headerLineIndex = -1;

        for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('code') && (line.includes('name') || line.includes('subject') || line.includes('course'))) {
                // This looks like a header
                const headers = this.tokenizeLine(line);
                columnMap = this.mapColumns(headers);
                headerLineIndex = i;
                logger.info(`Found header at line ${i}: ${line}`);
                break;
            }
        }

        // If we found a header, parse subsequent lines
        if (columnMap && headerLineIndex >= 0) {
            for (let i = headerLineIndex + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = this.tokenizeLine(line);
                // Use extractSubjects which handles "/" split codes and returns array
                const extracted = this.extractSubjects(values, columnMap, i + 1);
                subjects.push(...extracted);
            }
        } else {
            // Try pattern matching for subject codes
            // Look for patterns like: CODE123 followed by text
            const subjectPattern = /([A-Z]{2,4}\d{3,4})\s+(.+?)(?:\s+(\d)\s*(?:credit)?)?(?:\s+(\d))?$/i;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const match = line.match(subjectPattern);
                
                if (match) {
                    const code = match[1].toUpperCase();
                    const name = match[2].trim();
                    const creditHours = parseInt(match[3]) || 3;
                    const semester = parseInt(match[4]) || 1;

                    // Validate it looks like a subject
                    if (code.length >= 5 && name.length >= 3) {
                        subjects.push({
                            code,
                            name,
                            credit_hours: creditHours,
                            semester,
                            programme: this.extractProgramme(code)
                        });
                    }
                }
            }
        }

        // If still no subjects, try more aggressive extraction
        if (subjects.length === 0) {
            // Look for any code-like patterns
            const codePattern = /\b([A-Z]{2,4}\d{3,4}(?:_\d+)?)\b/g;
            const codesFound = new Set();
            
            for (const line of lines) {
                const matches = line.matchAll(codePattern);
                for (const match of matches) {
                    const code = match[1].toUpperCase();
                    if (!codesFound.has(code)) {
                        codesFound.add(code);
                        // Try to extract name from the line after the code
                        const afterCode = line.substring(line.indexOf(match[0]) + match[0].length).trim();
                        const namePart = afterCode.split(/\d/)[0].trim() || code;
                        
                        subjects.push({
                            code,
                            name: namePart.length > 3 ? namePart : code,
                            credit_hours: 3,
                            semester: 1,
                            programme: this.extractProgramme(code)
                        });
                    }
                }
            }
        }

        return subjects;
    }

    /**
     * Tokenize a line into values (handles various separators)
     */
    tokenizeLine(line) {
        // Try common separators: tab, multiple spaces, comma, pipe
        if (line.includes('\t')) {
            return line.split('\t').map(s => s.trim());
        }
        if (line.includes('|')) {
            return line.split('|').map(s => s.trim());
        }
        if (line.includes(',')) {
            return this.parseCSVLine(line);
        }
        // Split by multiple spaces
        return line.split(/\s{2,}/).map(s => s.trim());
    }

    /**
     * Map column headers to standard field names
     */
    mapColumns(headers) {
        const map = {
            code: -1,
            name: -1,
            credit_hours: -1,
            semester: -1,
            programme: -1
        };

        logger.info(`Mapping columns from headers: ${JSON.stringify(headers)}`);

        headers.forEach((header, index) => {
            const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Match code column
            if (h.includes('code') || h.includes('subjectcode') || h.includes('coursecode') || h === 'subject' || h === 'course' || h === 'kod') {
                map.code = index;
            }
            // Match name column - add more aliases
            if (h.includes('name') || h.includes('title') || h.includes('subjectname') || h.includes('coursename') || 
                h.includes('description') || h.includes('nama') || h.includes('subjek') || h === 'short' || h === 'fullname' ||
                h.includes('lesson') || h.includes('matapelajaran')) {
                if (map.name === -1) map.name = index;
            }
            if (h.includes('credit') || h.includes('hours') || h.includes('ch') || h.includes('unit') || h.includes('jam')) {
                map.credit_hours = index;
            }
            if (h.includes('sem') || h.includes('semester') || h.includes('year') || h.includes('level')) {
                map.semester = index;
            }
            if (h.includes('prog') || h.includes('programme') || h.includes('program') || h.includes('dept')) {
                if (map.code !== index && map.name !== index) map.programme = index;
            }
        });

        logger.info(`Column map result: code=${map.code}, name=${map.name}, credits=${map.credit_hours}, sem=${map.semester}, prog=${map.programme}`);

        return map;
    }

    /**
     * Extract subject data from row values using column map
     * Returns an array of subjects (handles "/" split codes)
     * @param {Array} values - Row values
     * @param {Object} columnMap - Column mapping
     * @param {number} lineNumber - Line number for logging
     * @param {number} currentSemester - Current semester from section header (optional)
     */
    extractSubjects(values, columnMap, lineNumber, currentSemester = null) {
        // Log first few rows for debugging
        if (lineNumber <= 5) {
            logger.info(`Row ${lineNumber} values: ${JSON.stringify(values)}`);
        }

        // Get code - required
        let rawCode = columnMap.code >= 0 && values[columnMap.code] 
            ? values[columnMap.code].trim().toUpperCase() 
            : null;

        // If no code column, try to find a code-like value in any column
        if (!rawCode) {
            for (const val of values) {
                if (/^[A-Z]{2,4}\d{3,4}/i.test(val)) {
                    rawCode = val.toUpperCase().split(/\s/)[0];
                    break;
                }
            }
        }

        if (!rawCode || rawCode.length < 4) {
            return []; // Skip rows without valid code
        }

        // Get name FIRST before processing codes
        let rawName = columnMap.name >= 0 && values[columnMap.name] 
            ? values[columnMap.name].trim() 
            : null;
        
        // If name column not found, try to find it by looking at all values
        if (!rawName) {
            // Look for the longest text value that isn't the code
            for (let i = 0; i < values.length; i++) {
                if (i !== columnMap.code && values[i] && values[i].length > 5) {
                    // Not a number and not the code
                    if (isNaN(values[i]) && !values[i].match(/^[A-Z]{2,4}\d{3,4}/i)) {
                        rawName = values[i].trim();
                        break;
                    }
                }
            }
        }

        if (lineNumber <= 5) {
            logger.info(`Row ${lineNumber}: code="${rawCode}", name="${rawName}"`);
        }

        // Get credit hours
        let creditHours = 3;
        if (columnMap.credit_hours >= 0 && values[columnMap.credit_hours]) {
            const ch = parseInt(values[columnMap.credit_hours]);
            if (!isNaN(ch) && ch > 0 && ch <= 20) {  // Allow up to 20 for things like industrial training
                creditHours = ch;
            }
        }

        // Get semester - use currentSemester from section header if provided
        let semester = currentSemester || 1;
        if (columnMap.semester >= 0 && values[columnMap.semester]) {
            const sem = parseInt(values[columnMap.semester]);
            if (!isNaN(sem) && sem >= 1 && sem <= 11) {
                semester = sem;
            }
        }

        // Get programme from file (will be overridden by user selection later)
        let programme = columnMap.programme >= 0 && values[columnMap.programme]
            ? values[columnMap.programme].trim()
            : 'UNKNOWN';

        // Handle "/" in codes - these are DIFFERENT subjects
        // e.g., "MPU3342 / MPU3362 / MPU3212" becomes THREE separate subjects
        // Split by "/" with optional spaces, then clean each code
        const codes = rawCode.split(/\s*\/\s*/)
            .map(c => c.trim().split('_')[0].trim())
            .filter(c => c.length >= 4 && /^[A-Z]{2,4}\d{3,4}$/i.test(c));

        // Handle "/" in names too - split them to match codes
        let names = [];
        if (rawName && rawName.includes('/')) {
            names = rawName.split(/\s*\/\s*/).map(n => n.trim());
        }

        const subjects = [];
        for (let i = 0; i < codes.length; i++) {
            const code = codes[i];
            // Use corresponding name if available, otherwise use first name or fallback to code
            const name = names[i] || names[0] || rawName || code;
            
            subjects.push({
                code: code,
                name: name,
                credit_hours: creditHours,
                semester: semester,
                programme: programme
            });
        }

        return subjects;
    }

    /**
     * Legacy single-subject extractor (calls new multi-subject method)
     */
    extractSubject(values, columnMap, lineNumber) {
        const subjects = this.extractSubjects(values, columnMap, lineNumber);
        return subjects.length > 0 ? subjects[0] : null;
    }

    /**
     * Extract programme from subject code
     * e.g., CT206 -> CT206, STA2133 -> STA
     */
    extractProgramme(code) {
        // Try to extract letter prefix
        const match = code.match(/^([A-Z]+)/);
        if (match) {
            const prefix = match[1];
            // If it's a common programme code pattern
            if (/^(CT|CC|IT|IS|CS|EN|EC|EE|ME|CE|BM|BA|AC)/.test(prefix)) {
                // Include numbers if they look like programme code (e.g., CT206)
                const progMatch = code.match(/^([A-Z]+\d{3})/);
                if (progMatch) return progMatch[1];
            }
            return prefix;
        }
        return 'UNKNOWN';
    }

    /**
     * Import subjects into database
     * @param {Array} subjects - Array of subject objects
     * @returns {Object} Import results
     */
    async importToDatabase(subjects) {
        const results = {
            total: subjects.length,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            imported: []
        };

        // Deduplicate by code
        const uniqueSubjects = {};
        for (const subject of subjects) {
            if (!uniqueSubjects[subject.code]) {
                uniqueSubjects[subject.code] = subject;
            }
        }

        const subjectsToImport = Object.values(uniqueSubjects);
        logger.info(`Importing ${subjectsToImport.length} unique subjects`);

        for (const subject of subjectsToImport) {
            try {
                // Check if subject exists
                const existing = await query(
                    'SELECT id FROM subjects WHERE code = $1',
                    [subject.code]
                );

                if (existing.rows.length > 0) {
                    // Update existing
                    await query(
                        `UPDATE subjects 
                         SET name = $1, credit_hours = $2, semester = $3, programme = $4, updated_at = NOW()
                         WHERE code = $5`,
                        [subject.name, subject.credit_hours, subject.semester, subject.programme, subject.code]
                    );
                    results.updated++;
                    results.imported.push({ ...subject, action: 'updated' });
                } else {
                    // Create new
                    await query(
                        `INSERT INTO subjects (code, name, credit_hours, semester, programme)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [subject.code, subject.name, subject.credit_hours, subject.semester, subject.programme]
                    );
                    results.created++;
                    results.imported.push({ ...subject, action: 'created' });
                }
            } catch (err) {
                logger.error(`Failed to import subject ${subject.code}:`, err);
                results.errors.push({ subject, error: err.message });
            }
        }

        results.skipped = results.total - subjectsToImport.length;
        return results;
    }

    /**
     * Process an uploaded file and import subjects
     * @param {Buffer} fileBuffer - File content as buffer
     * @param {string} filename - Original filename
     * @param {string} mimetype - File MIME type
     * @param {string} selectedProgramme - User-selected programme to assign to all subjects
     */
    async processFile(fileBuffer, filename, mimetype, selectedProgramme = null) {
        const ext = filename.toLowerCase().split('.').pop();
        let subjects = [];

        logger.info(`Processing file: ${filename}, type: ${mimetype}, extension: ${ext}, selectedProgramme: ${selectedProgramme}`);

        try {
            if (ext === 'csv' || mimetype === 'text/csv') {
                const content = fileBuffer.toString('utf-8');
                subjects = this.parseCSV(content);
            } else if (ext === 'xlsx' || ext === 'xls' || mimetype.includes('spreadsheet') || mimetype.includes('excel')) {
                subjects = this.parseXLSX(fileBuffer);
            } else if (ext === 'pdf' || mimetype === 'application/pdf') {
                subjects = await this.parsePDF(fileBuffer);
            } else {
                throw new Error(`Unsupported file type: ${ext}. Please use CSV, XLSX, or PDF.`);
            }

            logger.info(`Parsed ${subjects.length} subjects from ${filename}`);

            if (subjects.length === 0) {
                return {
                    success: false,
                    message: 'No subjects found in file. Please check the format.',
                    parsed: [],
                    results: null
                };
            }

            // If user selected a programme, override all subjects' programme
            if (selectedProgramme && selectedProgramme !== 'UNKNOWN') {
                logger.info(`Overriding programme for all subjects with: ${selectedProgramme}`);
                subjects = subjects.map(subject => ({
                    ...subject,
                    programme: selectedProgramme
                }));
            }

            // Import to database
            const results = await this.importToDatabase(subjects);

            return {
                success: true,
                message: `Imported ${results.created} new subjects, updated ${results.updated} existing.`,
                parsed: subjects,
                results
            };
        } catch (err) {
            logger.error(`Failed to process file ${filename}:`, err);
            throw err;
        }
    }
}

module.exports = new SubjectImportService();
