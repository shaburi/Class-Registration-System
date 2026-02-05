import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileImage, FileText, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleExport } from '../utils/timetableExport';

const EXPORT_OPTIONS = [
    { id: 'pdf', label: 'PDF Document', icon: FileText, color: 'text-red-500' },
    { id: 'png', label: 'PNG Image', icon: FileImage, color: 'text-blue-500' },
    { id: 'jpeg', label: 'JPEG Image', icon: FileImage, color: 'text-green-500' }
];

export default function ExportDropdown({ elementId, filename = 'timetable', title, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(null);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExportClick = async (format) => {
        setExporting(format);
        setIsOpen(false);

        const loadingToast = toast.loading(`Generating ${format.toUpperCase()}...`);

        try {
            await handleExport(format, elementId, filename, { title, orientation: 'landscape' });
            toast.success(`${format.toUpperCase()} exported successfully!`, { id: loadingToast });
        } catch (error) {
            console.error('Export failed:', error);
            toast.error(`Failed to export: ${error.message}`, { id: loadingToast });
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition shadow-md hover:shadow-lg disabled:opacity-50"
            >
                {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                <span>Export</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                    >
                        {EXPORT_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleExportClick(option.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                                >
                                    <Icon className={`w-5 h-5 ${option.color}`} />
                                    <span className="text-gray-700 dark:text-gray-200">{option.label}</span>
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
