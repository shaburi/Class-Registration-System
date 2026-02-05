import { useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * PrintStudentList Component
 * Displays a printable student roster for a section
 * Auto-triggers print dialog when mounted
 */
export default function PrintStudentList({ section, students, onClose }) {
    useEffect(() => {
        // Auto-trigger print dialog after component mounts
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const currentDate = new Date().toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="print-container">
            {/* Screen-only close button */}
            <div className="no-print">
                <button
                    onClick={onClose}
                    className="fixed top-4 right-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                >
                    Close
                </button>
            </div>

            {/* Printable content */}
            <div className="print-content">
                {/* Header */}
                <div className="header">
                    <h1>UPTM Class Registration System</h1>
                    <h2>Student Roster</h2>
                </div>

                {/* Section Details */}
                <div className="section-info">
                    <table className="info-table">
                        <tbody>
                            <tr>
                                <td className="label">Subject:</td>
                                <td className="value">{section.subject_code} - {section.subject_name}</td>
                            </tr>
                            <tr>
                                <td className="label">Section:</td>
                                <td className="value">{section.section_number}</td>
                            </tr>
                            <tr>
                                <td className="label">Lecturer:</td>
                                <td className="value">{section.lecturer_name || 'Not Assigned'}</td>
                            </tr>
                            <tr>
                                <td className="label">Schedule:</td>
                                <td className="value">
                                    {section.day} {section.start_time} - {section.end_time} | Room: {section.room}
                                </td>
                            </tr>
                            <tr>
                                <td className="label">Capacity:</td>
                                <td className="value">{section.enrolled_count} / {section.capacity}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Student List */}
                <div className="student-list">
                    <h3>Enrolled Students</h3>
                    <table className="students-table">
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Programme</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="no-students">No students enrolled</td>
                                </tr>
                            ) : (
                                students.map((student, index) => (
                                    <tr key={student.id}>
                                        <td>{index + 1}</td>
                                        <td>{student.student_id}</td>
                                        <td>{student.student_name}</td>
                                        <td>{student.programme}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="footer">
                    <p><strong>Total Students:</strong> {students.length}</p>
                    <p><strong>Print Date:</strong> {currentDate}</p>
                </div>
            </div>

            {/* Print-specific styles */}
            <style>{`
                /* Screen styles */
                .print-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                }

                .print-content {
                    font-family: Arial, sans-serif;
                    color: #000;
                }

                .header {
                    text-align: center;
                    margin-bottom: 2rem;
                    border-bottom: 3px solid #000;
                    padding-bottom: 1rem;
                }

                .header h1 {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0 0 0.5rem 0;
                }

                .header h2 {
                    font-size: 18px;
                    margin: 0;
                    color: #333;
                }

                .section-info {
                    margin-bottom: 2rem;
                }

                .info-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .info-table td {
                    padding: 0.5rem;
                    border-bottom: 1px solid #ddd;
                }

                .info-table .label {
                    font-weight: bold;
                    width: 150px;
                }

                .student-list h3 {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 1rem;
                    border-bottom: 2px solid #000;
                    padding-bottom: 0.5rem;
                }

                .students-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 2rem;
                }

                .students-table th,
                .students-table td {
                    border: 1px solid #000;
                    padding: 0.75rem;
                    text-align: left;
                }

                .students-table th {
                    background-color: #f0f0f0;
                    font-weight: bold;
                }

                .students-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }

                .no-students {
                    text-align: center;
                    font-style: italic;
                    color: #666;
                }

                .footer {
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 2px solid #000;
                    display: flex;
                    justify-content: space-between;
                }

                .footer p {
                    margin: 0;
                }

                /* Print-specific styles */
                @media print {
                    .no-print {
                        display: none !important;
                    }

                    .print-container {
                        padding: 0;
                        max-width: 100%;
                    }

                    .print-content {
                        page-break-inside: avoid;
                    }

                    .students-table {
                        page-break-inside: auto;
                    }

                    .students-table tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }

                    .students-table thead {
                        display: table-header-group;
                    }

                    body {
                        margin: 1cm;
                    }
                }
            `}</style>
        </div>
    );
}

PrintStudentList.propTypes = {
    section: PropTypes.object.isRequired,
    students: PropTypes.array.isRequired,
    onClose: PropTypes.func.isRequired
};
