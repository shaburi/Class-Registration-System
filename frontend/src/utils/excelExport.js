import * as XLSX from 'xlsx';

/**
 * Export students list to Excel file
 * Matches the format: Student Sections(Confirm) with columns:
 * No, kkursus, nama_pelajar, stud_ID, no_kp, (empty), semester, sec_no
 * @param {Object} section - Section details
 * @param {Array} students - Array of student objects
 */
export function exportStudentsToExcel(section, students) {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Title row
    const titleRow = ['Student Sections(Confirm)'];

    // Empty row
    const emptyRow = [];

    // Header row matching the exact format
    const headerRow = ['No', 'kkursus', 'nama_pelajar', 'stud_ID', 'no_kp', '', 'semester', 'sec_no'];

    // Student data rows
    const studentRows = students.map((student, index) => [
        index + 1,                              // No
        section.subject_code || '',             // kkursus (subject code)
        student.student_name || '',             // nama_pelajar
        student.student_id || '',               // stud_ID
        student.ic_number || student.no_kp || '', // no_kp (IC number)
        '',                                     // empty column
        student.semester || section.semester || '', // semester
        section.section_number || ''            // sec_no
    ]);

    // Combine all data
    const worksheetData = [
        titleRow,
        emptyRow,
        headerRow,
        ...studentRows
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths to match the format
    worksheet['!cols'] = [
        { wch: 5 },   // No
        { wch: 10 },  // kkursus
        { wch: 45 },  // nama_pelajar (wide for long names)
        { wch: 15 },  // stud_ID
        { wch: 15 },  // no_kp
        { wch: 5 },   // empty
        { wch: 10 },  // semester
        { wch: 8 }    // sec_no
    ];

    // Merge title cell across columns A-H
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } } // Merge A1:H1
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Generate filename
    const subjectCode = (section.subject_code || 'Section').replace(/[^a-zA-Z0-9]/g, '');
    const sectionNum = section.section_number || '1';
    const filename = `${subjectCode}_Sec${sectionNum}_Students.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
}

/**
 * Export multiple sections' students to a single Excel file with multiple sheets
 * @param {Array} sectionsData - Array of { section, students } objects
 */
export function exportMultipleSectionsToExcel(sectionsData) {
    const workbook = XLSX.utils.book_new();

    sectionsData.forEach(({ section, students }) => {
        const sheetName = `${section.subject_code}_Sec${section.section_number}`.substring(0, 31);

        const worksheetData = [
            ['Student Sections(Confirm)'],
            [],
            ['No', 'kkursus', 'nama_pelajar', 'stud_ID', 'no_kp', '', 'semester', 'sec_no'],
            ...students.map((student, index) => [
                index + 1,
                section.subject_code,
                student.student_name,
                student.student_id,
                student.ic_number || student.no_kp || '',
                '',
                student.semester || section.semester || '',
                section.section_number
            ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        worksheet['!cols'] = [
            { wch: 5 },
            { wch: 10 },
            { wch: 45 },
            { wch: 15 },
            { wch: 15 },
            { wch: 5 },
            { wch: 10 },
            { wch: 8 }
        ];
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const filename = `Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
}
