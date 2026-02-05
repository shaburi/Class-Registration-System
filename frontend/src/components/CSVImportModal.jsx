import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
                        onClick={() => { resetState(); onClose(); }} // Modified to include resetState
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
                    />

                    <div className="fixed inset-0 z-[10000] overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-2xl glass-card bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                                    <div>
                                        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                                        <p className="text-sm text-white/50 mt-1">{description}</p>
                                    </div>
                                    <button
                                        onClick={() => { resetState(); onClose(); }} // Modified to include resetState
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {errors.length > 0 && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400">
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
                                                    ? 'border-indigo-500 bg-indigo-500/10'
                                                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <input
                                                type="file"
                                                accept=".csv"
                                                ref={fileInputRef}
                                                onChange={(e) => handleFileSelect(e.target.files[0])}
                                                className="hidden"
                                            />

                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                                <Upload className={`w-8 h-8 ${dragOver ? 'text-indigo-400' : 'text-white/40'}`} />
                                            </div>

                                            <h3 className="text-lg font-semibold text-white mb-2">
                                                {dragOver ? 'Drop file here' : 'Upload CSV File'}
                                            </h3>
                                            <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">
                                                Drag and drop your file here, or click the button below to browse
                                            </p>

                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
                                            >
                                                Browse Files
                                            </button>

                                            <div className="mt-8 pt-6 border-t border-white/10">
                                                <p className="text-xs text-white/40 mb-3">Don't have the template?</p>
                                                <button
                                                    onClick={downloadTemplate}
                                                    className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                                                >
                                                    <Download size={14} />
                                                    Download Sample Template
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                                                        <FileSpreadsheet size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{file?.name}</p>
                                                        <p className="text-xs text-green-400">{preview.totalRows} rows found</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => { setFile(null); setPreview(null); }}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            <div className="rounded-xl border border-white/10 overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-white/50 uppercase bg-white/5 border-b border-white/10">
                                                            <tr>
                                                                {preview.columns.map((col) => (
                                                                    <th key={col} className="px-4 py-3 font-medium whitespace-nowrap">
                                                                        {col}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5 text-white/70">
                                                            {preview.data.map((row, i) => (
                                                                <tr key={i} className="bg-white/0 hover:bg-white/5 transition-colors">
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
                                                    <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-xs text-center text-white/40">
                                                        Showing first 5 of {preview.totalRows} rows
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-3 pt-2">
                                                <button
                                                    onClick={() => { setFile(null); setPreview(null); }}
                                                    className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleImport}
                                                    disabled={importing}
                                                    className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
