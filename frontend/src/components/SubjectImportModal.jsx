import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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



    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[10000] overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-3xl glass-card bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                                    <div>
                                        <h2 className="text-xl font-bold text-white tracking-tight">
                                            Import Subjects
                                        </h2>
                                        <p className="text-sm text-white/50 mt-1">
                                            Upload a CSV, Excel, or PDF file containing subject data
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all transform hover:rotate-90"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {/* File Upload Area */}
                                    {!result && (
                                        <div
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                            className={`
                                                relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
                                                ${dragActive
                                                    ? 'border-indigo-500 bg-indigo-500/10'
                                                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
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
                                                <div className="flex items-center justify-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                                                    {getFileIcon(file.name)}
                                                    <div className="text-left">
                                                        <p className="font-medium text-white">{file.name}</p>
                                                        <p className="text-sm text-white/50">
                                                            {(file.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFile(null);
                                                            setPreview(null);
                                                        }}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors ml-4"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                                        <Upload className={`w-8 h-8 ${dragActive ? 'text-indigo-400' : 'text-white/40'}`} />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-white mb-2">
                                                        {dragActive ? 'Drop file here' : 'Upload File'}
                                                    </h3>
                                                    <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">
                                                        Drag and drop your file here, or click to browse
                                                    </p>
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
                                                    >
                                                        Browse Files
                                                    </button>
                                                    <p className="mt-4 text-xs text-white/30">
                                                        Supports CSV, XLSX, XLS, and PDF
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Loading State */}
                                    {loading && (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                                            <span className="text-white/60">Parsing file...</span>
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {error && (
                                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-red-400">Error</p>
                                                <p className="text-sm text-red-300/80">{error}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Preview */}
                                    {preview && !result && (
                                        <div className="mt-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-medium text-white flex items-center gap-2">
                                                    <Eye className="w-5 h-5 text-indigo-400" />
                                                    Preview ({preview.total} subjects found)
                                                </h3>
                                            </div>

                                            {/* Programme Selector */}
                                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                <label className="block text-sm font-medium text-emerald-400 mb-2">
                                                    📚 Select Programme for All Subjects
                                                </label>
                                                <select
                                                    value={selectedProgramme}
                                                    onChange={(e) => setSelectedProgramme(e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-emerald-500/30 rounded-xl bg-black/40 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                                >
                                                    {programmes.map(prog => (
                                                        <option key={prog.code} value={prog.code} className="bg-gray-900">
                                                            {prog.code} - {prog.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="mt-2 text-xs text-emerald-400/70">
                                                    All subjects will be assigned to: {selectedProgramme}
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-white/10 overflow-hidden">
                                                <div className="overflow-x-auto max-h-[40vh]">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
                                                            <tr>
                                                                <th className="px-4 py-3 font-medium text-white/50">Code</th>
                                                                <th className="px-4 py-3 font-medium text-white/50">Name</th>
                                                                <th className="px-4 py-3 font-medium text-white/50">Credits</th>
                                                                <th className="px-4 py-3 font-medium text-white/50">Semester</th>
                                                                <th className="px-4 py-3 font-medium text-white/50">Programme</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5 text-white/70">
                                                            {preview.subjects.map((subject, idx) => (
                                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                    <td className="px-4 py-2 font-mono text-white">{subject.code}</td>
                                                                    <td className="px-4 py-2">{subject.name}</td>
                                                                    <td className="px-4 py-2 text-white/50">{subject.credit_hours}</td>
                                                                    <td className="px-4 py-2 text-white/50">{subject.semester}</td>
                                                                    <td className="px-4 py-2 text-white/50">{subject.programme}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Import Result */}
                                    {result && (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                                                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                                                <div className="w-full">
                                                    <p className="font-bold text-emerald-400 text-lg">Import Complete!</p>
                                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                        <div className="bg-black/20 p-3 rounded-lg">
                                                            <span className="text-white/50 block text-xs uppercase tracking-wider">Total</span>
                                                            <span className="font-bold text-white text-xl">{result.total}</span>
                                                        </div>
                                                        <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                                            <span className="text-emerald-400/70 block text-xs uppercase tracking-wider">Created</span>
                                                            <span className="font-bold text-emerald-400 text-xl">{result.created}</span>
                                                        </div>
                                                        <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                                                            <span className="text-yellow-400/70 block text-xs uppercase tracking-wider">Updated</span>
                                                            <span className="font-bold text-yellow-400 text-xl">{result.updated}</span>
                                                        </div>
                                                        <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                                            <span className="text-red-400/70 block text-xs uppercase tracking-wider">Errors</span>
                                                            <span className="font-bold text-red-400 text-xl">{result.errors?.length || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {result.errors?.length > 0 && (
                                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                    <p className="font-medium text-red-400 mb-2">Error Details:</p>
                                                    <div className="max-h-40 overflow-y-auto">
                                                        <ul className="text-sm text-red-300/80 space-y-1">
                                                            {result.errors.map((err, idx) => (
                                                                <li key={idx} className="flex gap-2">
                                                                    <span className="font-mono text-red-200 bg-red-500/20 px-1 rounded">{err.subject?.code}</span>
                                                                    <span>{err.error}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* File Format Help */}
                                    {!preview && !result && !loading && (
                                        <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                            <h4 className="font-medium text-indigo-400 mb-2 flex items-center gap-2">
                                                <FileText className="w-4 h-4" /> Expected Format
                                            </h4>
                                            <div className="text-sm text-indigo-300/80">
                                                <p className="mb-2">Your file should contain columns for:</p>
                                                <ul className="list-disc list-inside space-y-1 ml-2">
                                                    <li><strong className="text-indigo-200">Code</strong> - Subject code (e.g., CT206)</li>
                                                    <li><strong className="text-indigo-200">Name</strong> - Subject name</li>
                                                    <li><strong className="text-indigo-200">Credit Hours</strong> - (Optional, default: 3)</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-white/10">
                                    <button
                                        onClick={handleClose}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        {result ? 'Close' : 'Cancel'}
                                    </button>
                                    {preview && !result && (
                                        <button
                                            onClick={handleImport}
                                            disabled={importing || !preview?.subjects?.length}
                                            className={`
                                                flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg
                                                ${importing
                                                    ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20'
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
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default SubjectImportModal;
