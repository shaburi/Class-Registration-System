import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Upload,
    FileText,
    FileSpreadsheet,
    File,
    AlertTriangle,
    CheckCircle,
    Loader2,
    Eye,
    Download
} from 'lucide-react';
import api from '../services/api';

/**
 * SubjectImportModal Component
 * 
 * Allows importing subjects from CSV, XLSX, or PDF files.
 * Shows a preview before importing.
 */
const SubjectImportModal = ({ isOpen, onClose, onImportComplete }) => {
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [selectedProgramme, setSelectedProgramme] = useState('CT206');

    // Available programmes
    const programmes = [
        { code: 'CT206', name: 'Bachelor in Cyber Security' },
        { code: 'CT204', name: 'Bachelor in Software Engineering' },
        { code: 'CC101', name: 'Diploma in Computer Science' }
    ];

    const acceptedTypes = '.csv,.xlsx,.xls,.pdf';
    const acceptedMimeTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf'
    ];

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleFileSelect = async (selectedFile) => {
        setError(null);
        setPreview(null);
        setResult(null);

        // Validate file type
        const ext = selectedFile.name.toLowerCase().split('.').pop();
        if (!['csv', 'xlsx', 'xls', 'pdf'].includes(ext)) {
            setError('Invalid file type. Please upload a CSV, XLSX, or PDF file.');
            return;
        }

        setFile(selectedFile);
        
        // Get preview
        await loadPreview(selectedFile);
    };

    const loadPreview = async (selectedFile) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await api.post('/hop/subjects/import-file/preview', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 30000
            });

            if (response.data.success) {
                setPreview({
                    subjects: response.data.subjects,
                    total: response.data.total
                });
            } else {
                setError(response.data.message || 'Failed to parse file');
            }
        } catch (err) {
            console.error('Preview error:', err);
            setError(err.response?.data?.message || 'Failed to parse file. Please check the format.');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('programme', selectedProgramme);

            const response = await api.post('/hop/subjects/import-file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 60000
            });

            if (response.data.success) {
                setResult(response.data.results);
                if (onImportComplete) {
                    onImportComplete(response.data.results);
                }
            } else {
                setError(response.data.message || 'Import failed');
            }
        } catch (err) {
            console.error('Import error:', err);
            setError(err.response?.data?.message || 'Failed to import subjects');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        setResult(null);
        onClose();
    };

    const getFileIcon = (filename) => {
        const ext = filename?.toLowerCase().split('.').pop();
        if (ext === 'pdf') return <File className="w-8 h-8 text-red-500" />;
        if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
        return <FileText className="w-8 h-8 text-blue-500" />;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={handleClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl m-4"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Import Subjects
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Upload a CSV, Excel, or PDF file containing subject data
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                        {/* File Upload Area */}
                        {!result && (
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`
                                    relative border-2 border-dashed rounded-xl p-8 text-center transition-all
                                    ${dragActive 
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                                    }
                                `}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={acceptedTypes}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {file ? (
                                    <div className="flex items-center justify-center gap-4">
                                        {getFileIcon(file.name)}
                                        <div className="text-left">
                                            <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setFile(null);
                                                setPreview(null);
                                            }}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                                            Drag and drop your file here, or{' '}
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-primary-500 hover:text-primary-600 font-medium"
                                            >
                                                browse
                                            </button>
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Supports CSV, XLSX, XLS, and PDF files
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                                <span className="ml-3 text-gray-600 dark:text-gray-400">Parsing file...</span>
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-700 dark:text-red-400">Error</p>
                                    <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Preview */}
                        {preview && !result && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <Eye className="w-5 h-5 text-primary-500" />
                                        Preview ({preview.total} subjects found)
                                    </h3>
                                </div>

                                {/* Programme Selector */}
                                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <label className="block text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                                        📚 Select Programme for All Subjects
                                    </label>
                                    <select
                                        value={selectedProgramme}
                                        onChange={(e) => setSelectedProgramme(e.target.value)}
                                        className="w-full px-3 py-2 border border-green-300 dark:border-green-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                                    >
                                        {programmes.map(prog => (
                                            <option key={prog.code} value={prog.code}>
                                                {prog.code} - {prog.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                        All subjects will be assigned to: {selectedProgramme}
                                    </p>
                                </div>

                                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Code</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Credits</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Semester</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Programme</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {preview.subjects.map((subject, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-2 font-mono text-gray-900 dark:text-white">{subject.code}</td>
                                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{subject.name}</td>
                                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{subject.credit_hours}</td>
                                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{subject.semester}</td>
                                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{subject.programme}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Import Result */}
                        {result && (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-green-700 dark:text-green-400">Import Complete!</p>
                                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                                                <span className="ml-1 font-bold text-gray-900 dark:text-white">{result.total}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                                                <span className="ml-1 font-bold text-green-600">{result.created}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                                                <span className="ml-1 font-bold text-yellow-600">{result.updated}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Errors:</span>
                                                <span className="ml-1 font-bold text-red-600">{result.errors?.length || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {result.errors?.length > 0 && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="font-medium text-red-700 dark:text-red-400 mb-2">Errors:</p>
                                        <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
                                            {result.errors.slice(0, 5).map((err, idx) => (
                                                <li key={idx}>• {err.subject?.code}: {err.error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* File Format Help */}
                        {!preview && !result && !loading && (
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Expected Format</h4>
                                <p className="text-sm text-blue-600 dark:text-blue-300 mb-2">
                                    Your file should contain columns for:
                                </p>
                                <ul className="text-sm text-blue-600 dark:text-blue-300 list-disc list-inside space-y-1">
                                    <li><strong>Code</strong> - Subject code (e.g., CT206, STA2133)</li>
                                    <li><strong>Name</strong> - Subject name</li>
                                    <li><strong>Credit Hours</strong> - Number of credits (optional, default: 3)</li>
                                    <li><strong>Semester</strong> - Semester number (optional, default: 1)</li>
                                    <li><strong>Programme</strong> - Programme code (optional, auto-detected)</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            {result ? 'Close' : 'Cancel'}
                        </button>
                        {preview && !result && (
                            <button
                                onClick={handleImport}
                                disabled={importing || !preview?.subjects?.length}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                                    ${importing 
                                        ? 'bg-gray-300 cursor-not-allowed' 
                                        : 'bg-primary-500 text-white hover:bg-primary-600'
                                    }
                                `}
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Import {preview?.total} Subjects
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SubjectImportModal;
