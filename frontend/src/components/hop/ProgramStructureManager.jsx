import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers, Plus, FileSpreadsheet, Trash2, Edit2,
    ChevronRight, ChevronDown, Check, X, Search,
    Calendar, BookOpen, GraduationCap, Copy, Upload
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ConfirmDialog from '../ConfirmDialog';
import { toast } from 'react-hot-toast';

const PROGRAMMES = [
    { code: 'CT206', name: 'Bachelor of Computer Science (Software Engineering)' },
    { code: 'CT204', name: 'Bachelor of Computer Science (Computer Security)' },
    { code: 'CC101', name: 'Diploma of Computer Science (Information Technology)' }
];

const INTAKES = [
    { id: 'may', label: 'May Intake', color: 'emerald' },
    { id: 'august', label: 'August Intake', color: 'amber' },
    { id: 'december', label: 'December Intake', color: 'cyan' }
];

export default function ProgramStructureManager() {
    const [selectedProgramme, setSelectedProgramme] = useState(PROGRAMMES[0].code);
    const [structures, setStructures] = useState([]);
    const [selectedStructure, setSelectedStructure] = useState(null);
    const [loading, setLoading] = useState(false);

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        intake_type: 'may',
        effective_year: new Date().getFullYear(),
        name: ''
    });

    useEffect(() => {
        fetchStructures();
    }, [selectedProgramme]);

    const fetchStructures = async () => {
        setLoading(true);
        try {
            const response = await api.get('/program-structures', {
                params: { programme: selectedProgramme }
            });
            setStructures(response.data.data || []);
            // Select the most recent one by default if none selected
            if (!selectedStructure && response.data.data.length > 0) {
                // Determine most recent? or just first
                // setSelectedStructure(response.data.data[0]); 
            }
        } catch (error) {
            toast.error('Failed to load structures');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStructureDetails = async (id) => {
        try {
            const response = await api.get(`/program-structures/${id}`);
            setSelectedStructure(response.data.data);
        } catch (error) {
            toast.error('Failed to load structure details');
        }
    };

    const handleCreate = async () => {
        try {
            await api.post('/program-structures', {
                programme: selectedProgramme,
                ...formData
            });
            toast.success('Structure created successfully');
            setShowCreateModal(false);
            fetchStructures();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create structure');
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await api.delete(`/program-structures/${confirmDelete}`);
            toast.success('Structure deleted');
            setSelectedStructure(null);
            fetchStructures();
        } catch (error) {
            toast.error('Failed to delete structure');
        } finally {
            setConfirmDelete(null);
        }
    };

    const getIntakeColor = (type) => {
        switch (type) {
            case 'may': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'august': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'december': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            default: return 'bg-white/10 text-white/60 border-white/10';
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex gap-6 p-1">
            {/* Sidebar - Structure List */}
            <div className="w-1/3 flex flex-col gap-4">
                {/* Programme Selector */}
                <div className="glass-card p-1 rounded-2xl flex gap-1 bg-gray-100 dark:bg-black/20">
                    {PROGRAMMES.map(prog => (
                        <button
                            key={prog.code}
                            onClick={() => setSelectedProgramme(prog.code)}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${selectedProgramme === prog.code
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'text-gray-600 dark:text-white/60 hover:bg-white/50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white'
                                }`}
                        >
                            {prog.code}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowCreateModal(true)}
                        icon={Plus}
                    >
                        New Structure
                    </Button>
                    <Button
                        variant="ghost"
                        className="glass-card"
                        onClick={() => setShowImportModal(true)}
                        icon={FileSpreadsheet}
                    >
                        Import
                    </Button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    <AnimatePresence>
                        {structures.map((struct, index) => (
                            <motion.div
                                key={struct.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => fetchStructureDetails(struct.id)}
                                className={`glass-card p-4 rounded-2xl cursor-pointer group transition-all border ${selectedStructure?.id === struct.id
                                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    : 'hover:bg-gray-50 dark:hover:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getIntakeColor(struct.intake_type)}`}>
                                        {struct.intake_type}
                                    </span>
                                    <span className="text-gray-400 dark:text-white/40 text-xs font-mono">{struct.effective_year}</span>
                                </div>
                                <h3 className={`font-bold transition-colors ${selectedStructure?.id === struct.id ? 'text-indigo-600 dark:text-white' : 'text-gray-700 dark:text-white/80 group-hover:text-indigo-600 dark:group-hover:text-white'}`}>
                                    {struct.name}
                                </h3>
                                <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-white/40">
                                    <span className="flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" />
                                        {struct.total_courses || 0} Courses
                                    </span>
                                    <div className={`w-2 h-2 rounded-full ${struct.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300 dark:bg-white/20'}`} />
                                </div>
                            </motion.div>
                        ))}
                        {structures.length === 0 && !loading && (
                            <div className="text-center py-10 text-white/30">
                                <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No structures found</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Content - Structure Details */}
            <div className="flex-1 glass-card rounded-3xl overflow-hidden flex flex-col relative">
                {selectedStructure ? (
                    <>
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex justify-between items-start z-10 relative">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/60">
                                        {selectedStructure.name}
                                    </h2>
                                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-white/10 rounded-full text-xs font-mono text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/10">
                                        ID: {selectedStructure.id.slice(0, 8)}
                                    </span>
                                </div>
                                <div className="flex gap-4 text-sm text-gray-500 dark:text-white/50">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Effective {selectedStructure.effective_year}</span>
                                    <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-pink-500 dark:text-pink-400" /> {selectedStructure.programme}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setConfirmDelete(selectedStructure.id)}
                                    icon={Trash2}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/30 dark:bg-black/20">
                            <SemesterList structure={selectedStructure} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-white/30">
                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6 border border-gray-200 dark:border-white/5">
                            <Layers className="w-12 h-12 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-600 dark:text-white/60 mb-2">No Structure Selected</h3>
                        <p className="max-w-xs text-center">Select a program structure from the list or create a new one to manage courses.</p>
                    </div>
                )}
            </div>

            {/* Create Structure Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Program Structure"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-700 dark:text-white/60 mb-1">Structure Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-indigo-500/50 outline-none"
                            placeholder="e.g. BCS SE May 2024"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-white/60 mb-1">Intake</label>
                            <select
                                value={formData.intake_type}
                                onChange={(e) => setFormData({ ...formData, intake_type: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-indigo-500/50 outline-none appearance-none"
                            >
                                {INTAKES.map(i => <option key={i.id} value={i.id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{i.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-white/60 mb-1">Effective Year</label>
                            <input
                                type="number"
                                value={formData.effective_year}
                                onChange={(e) => setFormData({ ...formData, effective_year: parseInt(e.target.value) })}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-indigo-500/50 outline-none"
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleCreate}>Create Structure</Button>
                    </div>
                </div>
            </Modal>

            {/* Import Modal */}
            <Modal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                title="Import Structure from Excel"
            >
                <ImportStructureForm
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        setShowImportModal(false);
                        fetchStructures();
                    }}
                    programme={selectedProgramme}
                />
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Delete Structure?"
                message="This will permanently delete the structure and all its course associations. This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}

// Sub-components

function SemesterList({ structure }) {
    // Group courses by semester (assuming structure.courses exists)
    const coursesBySem = structure.courses?.reduce((acc, course) => {
        const sem = course.semester || 0;
        if (!acc[sem]) acc[sem] = [];
        acc[sem].push(course);
        return acc;
    }, {}) || {};

    const semesters = Object.keys(coursesBySem).sort((a, b) => parseInt(a) - parseInt(b));

    if (semesters.length === 0) {
        return (
            <div className="text-center py-20 opacity-50">
                <p>No courses added yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {semesters.map(sem => (
                <motion.div
                    key={sem}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                            Semester {sem} / Year {Math.ceil(sem / 3)}
                        </span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {coursesBySem[sem].map(course => (
                            <div key={course.id} className="glass-card p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/20 transition-all group">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{course.subject_code}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50">{course.credit_hours} Cr</span>
                                </div>
                                <h4 className="text-sm text-gray-600 dark:text-white/70 mt-1 line-clamp-2 min-h-[2.5em]">{course.subject_name}</h4>
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-xs">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${course.status?.toLowerCase().includes('core') ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                        }`}>
                                        {course.status || 'Core'}
                                    </span>
                                    {course.prerequisite_codes?.length > 0 && (
                                        <span className="text-gray-400 dark:text-white/30" title={`Prereq: ${course.prerequisite_codes.join(', ')}`}>
                                            Pre: {course.prerequisite_codes[0]}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function ImportStructureForm({ onClose, onSuccess, programme }) {
    const [file, setFile] = useState(null);
    const [year, setYear] = useState(new Date().getFullYear());
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('programme', programme);
        formData.append('effective_year', year);

        try {
            const response = await api.post('/program-structures/import-excel', formData);
            console.log('[IMPORT RESPONSE]', response.data);

            const result = response.data.data || {};
            const errors = result.errors || [];
            const totalCourses = result.totalCourses || 0;
            const createdSubjects = result.createdSubjects || [];

            if (totalCourses > 0) {
                toast.success(`Imported ${totalCourses} courses successfully!`);
                if (createdSubjects.length > 0) {
                    toast.success(`Auto-created ${createdSubjects.length} new subjects`);
                }
            } else if (errors.length > 0) {
                errors.forEach(err => toast.error(err));
            } else {
                toast.error('No courses found in Excel file. Check sheet names and format.');
            }

            onSuccess();
        } catch (error) {
            console.error('[IMPORT ERROR]', error.response?.data);
            toast.error(error.response?.data?.message || 'Import failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={`border-2 border-dashed border-white/10 rounded-xl p-8 text-center transition-all ${file ? 'bg-indigo-500/10 border-indigo-500/50' : 'hover:bg-white/5 hover:border-white/20'}`}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={(e) => setFile(e.target.files[0])}
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                    <Upload className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-indigo-400' : 'text-white/30'}`} />
                    <p className="font-medium text-white">{file ? file.name : 'Click to select Excel file'}</p>
                    <p className="text-xs text-white/40 mt-1">Supports multi-sheet import (May/Aug/Dec)</p>
                </label>
            </div>

            <div>
                <label className="block text-sm text-white/60 mb-1">Effective Year</label>
                <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50"
                />
            </div>

            <div className="pt-2 flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleUpload} disabled={!file || uploading}>
                    {uploading ? 'Importing...' : 'Start Import'}
                </Button>
            </div>
        </div>
    );
}
