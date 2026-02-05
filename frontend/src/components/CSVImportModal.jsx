import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
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

        if (!selectedFile.name.endsWith('.csv')) {
            setErrors(['Please select a CSV file']);
            return;
        }

        setFile(selectedFile);
        setErrors([]);

        // Parse for preview
        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Validate required columns
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
                    data: results.data.slice(0, 5), // Show first 5 rows
                    totalRows: results.data.length,
                    allData: results.data
                });
            },
            error: (error) => {
                setErrors([`Failed to parse CSV: ${error.message}`]);
            }
        });
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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl pointer-events-auto max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Template Download */}
                                {templateColumns.length > 0 && (
                                    <button
                                        onClick={downloadTemplate}
                                        className="flex items-center gap-2 mb-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download CSV Template
                                    </button>
                                )}

                                {/* Upload Area */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
                                        }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => handleFileSelect(e.target.files[0])}
                                        className="hidden"
                                    />
                                    <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-indigo-500' : 'text-gray-400'
                                        }`} />
                                    {file ? (
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Click or drag to replace
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-medium text-gray-700 dark:text-gray-300">
                                                Drop your CSV file here, or click to browse
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                Accepts .csv files only
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Errors */}
                                {errors.length > 0 && (
                                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                            <AlertCircle className="w-5 h-5" />
                                            <span className="font-medium">Errors found:</span>
                                        </div>
                                        <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                                            {errors.map((error, i) => (
                                                <li key={i}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Preview */}
                                {preview && (
                                    <div className="mt-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                                Preview ({preview.totalRows} rows)
                                            </h3>
                                        </div>
                                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                                <thead className="bg-gray-50 dark:bg-gray-800">
                                                    <tr>
                                                        {preview.columns.map(col => (
                                                            <th key={col} className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {preview.data.map((row, i) => (
                                                        <tr key={i} className="bg-white dark:bg-gray-900">
                                                            {preview.columns.map(col => (
                                                                <td key={col} className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                                                    {row[col] || '-'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {preview.totalRows > 5 && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                                                Showing first 5 of {preview.totalRows} rows
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={!preview || errors.length > 0 || importing}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {importing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            Import {preview?.totalRows || 0} Rows
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CSVImportModal;
