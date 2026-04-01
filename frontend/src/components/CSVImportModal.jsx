import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    X,
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';

/**
 * Reusable CSV Import Modal Component
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {string} description - Description text
 * @param {array} templateColumns - Array of column names for template download
 * @param {array} sampleData - Sample data rows for template (array of objects)
 * @param {function} onImport - Callback with parsed data: (data, errors) => void
 * @param {array} requiredColumns - Required column names for validation
 */
const CSVImportModal = ({
    isOpen,
    onClose,
    title = 'Import CSV',
    description = 'Upload a CSV file to import data',
    templateColumns = [],
    sampleData = [],
    onImport,
    requiredColumns = [],
    importing = false
}) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [errors, setErrors] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;

        const ext = selectedFile.name.toLowerCase().split('.').pop();
        if (!['csv', 'xlsx', 'xls'].includes(ext)) {
            setErrors(['Please select a CSV or Excel (.xlsx, .xls) file']);
            return;
        }

        setFile(selectedFile);
        setErrors([]);

        if (ext === 'xlsx' || ext === 'xls') {
            // Parse Excel file
            parseExcelFile(selectedFile);
        } else {
            // Parse CSV with PapaParse
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (requiredColumns.length > 0) {
                        const missingColumns = requiredColumns.filter(
                            col => !results.meta.fields?.includes(col)
                        );
                        if (missingColumns.length > 0) {
                            setErrors([`Missing required columns: ${missingColumns.join(', ')}`]);
                            setPreview(null);
                            return;
                        }
                    }

                    setPreview({
                        columns: results.meta.fields || [],
                        data: results.data.slice(0, 5),
                        totalRows: results.data.length,
                        allData: results.data
                    });
                },
                error: (error) => {
                    setErrors([`Failed to parse CSV: ${error.message}`]);
                }
            });
        }
    };

    // Smart Excel parser — finds the header row automatically
    const parseExcelFile = (selectedFile) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convert entire sheet to 2D array to find the header row
                const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                // Known header patterns for "course code" columns
                const codePatterns = ['course code', 'subject code', 'code', 'course_code', 'subject_code', 'coursecode', 'subjectcode'];
                const namePatterns = ['course name', 'subject name', 'name', 'course_name', 'subject_name', 'coursename', 'subjectname'];
                const creditPatterns = ['credits', 'credit', 'credit hours', 'credit_hours', 'credithours', 'cr'];

                // Scan rows 0-10 for the header row
                let headerRowIdx = -1;
                let headerCells = [];
                for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
                    const row = rawRows[i];
                    if (!row || row.length === 0) continue;
                    const lowered = row.map(cell => String(cell || '').toLowerCase().trim());
                    // Check if this row has a "code" column
                    if (lowered.some(c => codePatterns.includes(c))) {
                        headerRowIdx = i;
                        headerCells = lowered;
                        break;
                    }
                }

                if (headerRowIdx === -1) {
                    // Fallback: try default xlsx parsing with header: 1 (first row as header)
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                    if (jsonData.length === 0) {
                        setErrors(['No data found in Excel file']);
                        return;
                    }
                    // Try to map common column names to subject_code
                    const mapped = mapExcelDataToSubjectCodes(jsonData);
                    if (mapped) {
                        setPreview(mapped);
                    } else {
                        setErrors(['Could not find a "Course Code" or "Subject Code" column in the Excel file. Please check the file format.']);
                    }
                    return;
                }

                // Map column indices
                const codeIdx = headerCells.findIndex(c => codePatterns.includes(c));
                const nameIdx = headerCells.findIndex(c => namePatterns.includes(c));
                const creditIdx = headerCells.findIndex(c => creditPatterns.includes(c));

                // Extract data rows (skip header row and any empty rows)
                const dataRows = [];
                for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
                    const row = rawRows[i];
                    if (!row || row.length === 0) continue;
                    const code = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';
                    if (!code) continue;
                    // Skip summary rows like "Total Credits:"
                    if (code.toLowerCase().includes('total')) continue;

                    const item = { subject_code: code };
                    if (nameIdx >= 0) item.course_name = String(row[nameIdx] || '').trim();
                    if (creditIdx >= 0) item.credits = String(row[creditIdx] || '').trim();
                    dataRows.push(item);
                }

                if (dataRows.length === 0) {
                    setErrors(['No course data found in the Excel file after the header row.']);
                    return;
                }

                const columns = ['subject_code'];
                if (nameIdx >= 0) columns.push('course_name');
                if (creditIdx >= 0) columns.push('credits');

                setPreview({
                    columns,
                    data: dataRows.slice(0, 5),
                    totalRows: dataRows.length,
                    allData: dataRows
                });
            } catch (err) {
                console.error('Excel parse error:', err);
                setErrors([`Failed to parse Excel file: ${err.message}`]);
            }
        };
        reader.onerror = () => {
            setErrors(['Failed to read the file']);
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    // Fallback mapper for standard xlsx (first row as header)
    const mapExcelDataToSubjectCodes = (jsonData) => {
        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow);
        const codePatterns = ['course code', 'subject code', 'code', 'course_code', 'subject_code'];
        const namePatterns = ['course name', 'subject name', 'name', 'course_name', 'subject_name'];

        const codeKey = keys.find(k => codePatterns.includes(k.toLowerCase().trim()));
        if (!codeKey) return null;
        const nameKey = keys.find(k => namePatterns.includes(k.toLowerCase().trim()));

        const dataRows = jsonData
            .filter(row => {
                const val = String(row[codeKey] || '').trim();
                return val && !val.toLowerCase().includes('total');
            })
            .map(row => {
                const item = { subject_code: String(row[codeKey]).trim() };
                if (nameKey) item.course_name = String(row[nameKey] || '').trim();
                return item;
            });

        if (dataRows.length === 0) return null;

        const columns = ['subject_code'];
        if (nameKey) columns.push('course_name');

        return {
            columns,
            data: dataRows.slice(0, 5),
            totalRows: dataRows.length,
            allData: dataRows
        };
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFileSelect(droppedFile);
    };

    const handleImport = () => {
        if (preview && preview.allData && onImport) {
            onImport(preview.allData, preview.columns);
        }
    };

    const downloadTemplate = () => {
        const csvContent = Papa.unparse({
            fields: templateColumns,
            data: sampleData
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
        link.click();
    };

    const resetState = () => {
        setFile(null);
        setPreview(null);
        setErrors([]);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    // The original handleClose is no longer directly used by the new JSX,
    // as the new JSX calls onClose directly.
    // However, the resetState logic is important for cleanup.
    // We'll ensure resetState is called when the modal closes.
    // This can be done by modifying the onClose prop if it's not already handling reset,
    // or by adding a useEffect to reset state when isOpen becomes false.
    // For this change, we'll assume onClose handles the full close logic including state reset,
    // or that the component's state should persist until a new file is selected or the modal is reopened.
    // Given the instruction is to apply glass styles, we'll stick to the provided JSX structure.

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { resetState(); onClose(); }}
                        className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm z-[9999]"
                    />

                    <div className="fixed inset-0 z-[10000] overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-2xl glass-card bg-white/95 dark:bg-[#0b0d14]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-blue-500/10"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
                                        <p className="text-sm text-gray-500 dark:text-white/50 mt-1">{description}</p>
                                    </div>
                                    <button
                                        onClick={() => { resetState(); onClose(); }}
                                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/50 dark:hover:text-white transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {errors.length > 0 && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3 text-red-600 dark:text-red-400">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm">
                                                <p className="font-semibold">Import Error</p>
                                                <ul className="list-disc list-inside mt-1 space-y-1 opacity-90">
                                                    {errors.map((err, idx) => (
                                                        <li key={idx}>{err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {!preview ? (
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                            className={`
                                                relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
                                                ${dragOver
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                    : 'border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-400 dark:hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <input
                                                type="file"
                                                accept=".csv,.xlsx,.xls"
                                                ref={fileInputRef}
                                                onChange={(e) => handleFileSelect(e.target.files[0])}
                                                className="hidden"
                                            />

                                            <div className="w-16 h-16 rounded-full bg-white dark:bg-white/5 shadow-sm border border-gray-100 dark:border-transparent flex items-center justify-center mx-auto mb-4">
                                                <Upload className={`w-8 h-8 ${dragOver ? 'text-blue-500' : 'text-gray-400 dark:text-white/40'}`} />
                                            </div>

                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                {dragOver ? 'Drop file here' : 'Upload CSV or Excel File'}
                                            </h3>
                                            <p className="text-gray-500 dark:text-white/40 text-sm mb-6 max-w-xs mx-auto">
                                                Drag and drop your CSV or Excel (.xlsx) file here, or click the button below
                                            </p>

                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                                            >
                                                Browse Files
                                            </button>

                                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                                                <p className="text-xs text-gray-500 dark:text-white/40 mb-3">Don't have the template?</p>
                                                <button
                                                    onClick={downloadTemplate}
                                                    className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                                >
                                                    <Download size={14} />
                                                    Download Sample Template
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
                                                        <FileSpreadsheet size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file?.name}</p>
                                                        <p className="text-xs text-green-600 dark:text-green-400">{preview.totalRows} rows found</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => { setFile(null); setPreview(null); }}
                                                    className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-gray-500 dark:text-white/50 uppercase bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                                            <tr>
                                                                {preview.columns.map((col) => (
                                                                    <th key={col} className="px-4 py-3 font-medium whitespace-nowrap">
                                                                        {col}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 dark:divide-white/5 text-gray-700 dark:text-white/70">
                                                            {preview.data.map((row, i) => (
                                                                <tr key={i} className="bg-white dark:bg-white/0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                                    {Object.values(row).map((cell, j) => (
                                                                        <td key={j} className="px-4 py-3 whitespace-nowrap">
                                                                            {cell}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {preview.totalRows > 5 && (
                                                    <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10 text-xs text-center text-gray-500 dark:text-white/40">
                                                        Showing first 5 of {preview.totalRows} rows
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-3 pt-2">
                                                <button
                                                    onClick={() => { setFile(null); setPreview(null); }}
                                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleImport}
                                                    disabled={importing}
                                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {importing ? (
                                                        <>
                                                            <Loader2 size={16} className="animate-spin" />
                                                            Importing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={16} />
                                                            Confirm Import
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default CSVImportModal;
