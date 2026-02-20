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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)] pt-2"
        >
            {/* Sidebar - Structure List */}
            <div className="w-full md:w-1/3 flex flex-col gap-5 h-[40vh] md:h-full">
                {/* Programme Selector */}
                <div className="relative p-1.5 rounded-2xl bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] flex gap-1">
                    {PROGRAMMES.map(prog => (
                        <button
                            key={prog.code}
                            onClick={() => setSelectedProgramme(prog.code)}
                            className={`relative flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${selectedProgramme === prog.code
                                ? 'text-white shadow-[0_4px_15px_rgba(147,51,234,0.3)]'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {selectedProgramme === prog.code && (
                                <motion.div
                                    layoutId="activeProgramme"
                                    className="absolute inset-0 bg-gradient-to-r from-red-600 to-blue-600 rounded-xl -z-10"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            {prog.code}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="group relative flex-1 overflow-hidden flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 border border-white/20 hover:-translate-y-0.5"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
                        <Plus size={18} className="relative z-10 mr-2 transition-transform group-hover:rotate-90" />
                        <span className="font-bold tracking-wide relative z-10 text-sm">New</span>
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="group relative flex-1 flex items-center justify-center px-4 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl text-blue-600 dark:text-blue-400 font-bold tracking-wide hover:shadow-[0_8px_25px_rgba(99,102,241,0.2)] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all duration-300 text-sm hover:-translate-y-0.5"
                    >
                        <FileSpreadsheet size={18} className="mr-2 group-hover:-translate-y-0.5 transition-transform" />
                        Import
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-3 pb-6 md:pb-0">
                    <AnimatePresence>
                        {structures.map((struct, index) => (
                            <motion.div
                                key={struct.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => fetchStructureDetails(struct.id)}
                                className={`relative group p-5 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${selectedStructure?.id === struct.id
                                    ? 'bg-white/80 dark:bg-blue-500/10 border border-blue-400/60 dark:border-blue-500/50 shadow-[0_8px_30px_rgba(99,102,241,0.2)] dark:shadow-[0_8px_30px_rgba(99,102,241,0.3)] -translate-y-1'
                                    : 'bg-white/40 dark:bg-white/5 border border-gray-300/80 dark:border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-white/60 dark:hover:bg-white/10 hover:border-blue-400/60 dark:hover:border-blue-500/30 hover:-translate-y-0.5'
                                    }`}
                            >
                                {/* Animated border glow on hover for unselected items */}
                                {selectedStructure?.id !== struct.id && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-red-400/0 to-blue-400/0 group-hover:from-blue-500/10 group-hover:via-red-500/10 group-hover:to-blue-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none rounded-2xl"></div>
                                )}

                                {selectedStructure?.id === struct.id && (
                                    <motion.div
                                        layoutId="activeBorder"
                                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-red-500"
                                    />
                                )}

                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${getIntakeColor(struct.intake_type)}`}>
                                        {struct.intake_type}
                                    </span>
                                    <span className="px-2 py-0.5 rounded border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-black tracking-widest">
                                        {struct.effective_year}
                                    </span>
                                </div>
                                <h3 className={`relative z-10 text-base font-black tracking-tight leading-tight transition-colors ${selectedStructure?.id === struct.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                                    {struct.name}
                                </h3>
                                <div className="relative z-10 mt-4 pt-4 border-t border-gray-200 dark:border-white/5 flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-black/20 rounded-md border border-gray-100 dark:border-white/5">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        {struct.total_courses || 0} Courses
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={struct.is_active ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-400'}>
                                            {struct.is_active ? 'Active' : 'Draft'}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${struct.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-gray-300 dark:bg-white/20'}`} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {structures.length === 0 && !loading && (
                            <div className="text-center py-16 px-4 bg-white/40 dark:bg-white/5 rounded-3xl border border-white/40 dark:border-white/5 border-dashed">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 mx-auto mb-4 flex items-center justify-center">
                                    <Layers className="w-8 h-8 text-blue-500/50" />
                                </div>
                                <h4 className="text-gray-900 dark:text-white font-bold mb-1">No Structures</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Create a new structure or import one from Excel to get started.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Content - Structure Details */}
            <div className="flex-1 relative overflow-hidden flex flex-col rounded-[32px] bg-white/40 dark:bg-[#11131e]/50 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
                {selectedStructure ? (
                    <>
                        <div className="p-8 border-b border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-white/5 flex flex-col lg:flex-row justify-between lg:items-center gap-4 z-10 relative">
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                        <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/70 tracking-tight">
                                        {selectedStructure.name}
                                    </h2>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 ml-14">
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/5">
                                        <span className="text-gray-400 dark:text-gray-500">ID:</span>
                                        <span className="font-mono text-gray-700 dark:text-gray-300">{selectedStructure.id.slice(0, 8)}</span>
                                    </span>
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/5">
                                        <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                        Effective <span className="text-gray-900 dark:text-white font-bold">{selectedStructure.effective_year}</span>
                                    </span>
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/5">
                                        <Layers className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                        Programme <span className="text-gray-900 dark:text-white font-bold">{selectedStructure.programme}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center lg:self-start ml-14 lg:ml-0">
                                <button
                                    onClick={() => setConfirmDelete(selectedStructure.id)}
                                    className="group relative overflow-hidden flex items-center justify-center px-4 py-2.5 bg-red-50 hover:bg-red-500 dark:bg-red-500/10 dark:hover:bg-red-600 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white rounded-xl transition-all duration-300 border border-red-200 dark:border-red-500/20 shadow-sm"
                                >
                                    <Trash2 size={18} className="mr-2" />
                                    <span className="font-bold tracking-wide">Delete</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-gray-50/10 dark:bg-black/10 relative">
                            {/* Ambient background glow inside list area */}
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 dark:bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

                            <div className="relative z-10">
                                <SemesterList structure={selectedStructure} />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8">
                        <div className="relative w-32 h-32 mb-8">
                            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
                            <div className="relative w-full h-full rounded-3xl bg-white/50 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-inner">
                                <Layers className="w-16 h-16 text-blue-400/50 dark:text-blue-500/30" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-3">No Structure Selected</h3>
                        <p className="max-w-sm text-center font-medium leading-relaxed">
                            Select a program structure from the sidebar or create a new one to manage courses, semesters, and prerequisites.
                        </p>
                    </div>
                )}
            </div>

            {/* Create Structure Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Program Structure"
            >
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Structure Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                            placeholder="e.g. BCS SE May 2024"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Intake</label>
                            <select
                                value={formData.intake_type}
                                onChange={(e) => setFormData({ ...formData, intake_type: e.target.value })}
                                className="w-full bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all shadow-inner"
                            >
                                {INTAKES.map(i => <option key={i.id} value={i.id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{i.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Effective Year</label>
                            <input
                                type="number"
                                value={formData.effective_year}
                                onChange={(e) => setFormData({ ...formData, effective_year: parseInt(e.target.value) })}
                                className="w-full bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    <div className="pt-6 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <button
                            onClick={handleCreate}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all duration-300 hover:-translate-y-0.5"
                        >
                            Create Structure
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Import Modal */}
            <Modal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                title="Import Structure from Excel"
            >
                <div className="pt-2">
                    <ImportStructureForm
                        onClose={() => setShowImportModal(false)}
                        onSuccess={() => {
                            setShowImportModal(false);
                            fetchStructures();
                        }}
                        programme={selectedProgramme}
                    />
                </div>
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
        </motion.div>
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
            <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-gray-400">
                <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 bg-gray-200 dark:bg-white/5 rounded-full blur-xl" />
                    <div className="relative w-full h-full rounded-2xl bg-white dark:bg-[#11131e] flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-sm">
                        <BookOpen className="w-8 h-8 opacity-40 text-gray-600 dark:text-white" />
                    </div>
                </div>
                <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Courses Added</h4>
                <p className="text-sm mt-1">This structure is currently empty.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {semesters.map(sem => (
                <motion.div
                    key={sem}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5 }}
                    className="space-y-5"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-white/20 to-transparent" />
                        <span className="px-4 py-1.5 rounded-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 shadow-sm">
                            Semester {sem} <span className="text-gray-400 dark:text-white/30 mx-2">|</span> Year {Math.ceil(sem / 3)}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-white/20 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {coursesBySem[sem].map((course, idx) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group relative bg-white/60 dark:bg-[#07090e]/60 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.15)] dark:hover:shadow-[0_12px_40px_rgba(99,102,241,0.3)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-red-500/0 group-hover:from-blue-500/5 group-hover:to-red-500/5 transition-colors duration-500 pointer-events-none" />

                                <div className="relative z-10 flex justify-between items-start mb-3">
                                    <span className="font-black text-lg text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-red-600 dark:group-hover:from-blue-400 dark:group-hover:to-red-400 transition-all duration-300">
                                        {course.subject_code}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 text-[10px] font-bold tracking-wider shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                                        {course.credit_hours} CR
                                    </span>
                                </div>

                                <h4 className="relative z-10 text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed mb-4 line-clamp-2 min-h-[2.75rem]">
                                    {course.subject_name}
                                </h4>

                                <div className="relative z-10 pt-4 mt-auto border-t border-gray-100 dark:border-white/10 flex justify-between items-center text-xs">
                                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-black tracking-widest ${course.status?.toLowerCase().includes('core')
                                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                                        : 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20'
                                        }`}>
                                        {course.status || 'Core'}
                                    </span>

                                    {course.prerequisite_codes?.length > 0 && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-500/10 rounded-md border border-red-100 dark:border-red-500/20" title={`Prerequisite: ${course.prerequisite_codes.join(', ')}`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 animate-pulse" />
                                            <span className="text-[10px] font-bold text-red-700 dark:text-red-400 tracking-wider">
                                                PRE: {course.prerequisite_codes[0]}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
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
        <div className="space-y-6">
            <div
                className={`relative overflow-hidden group border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${file
                    ? 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-500 shadow-[0_0_30px_rgba(99,102,241,0.1)]'
                    : 'bg-gray-50/50 dark:bg-white/5 border-gray-300 dark:border-white/20 hover:bg-gray-100/50 dark:hover:bg-white/10 hover:border-blue-400 dark:hover:border-blue-500/50'
                    }`}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={(e) => setFile(e.target.files[0])}
                />
                <label htmlFor="file-upload" className="cursor-pointer block relative z-10">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${file ? 'bg-blue-500' : 'bg-gray-200 dark:bg-white/10 group-hover:bg-blue-500/20 group-hover:scale-110'
                        }`}>
                        <Upload className={`w-8 h-8 transition-colors ${file ? 'text-white' : 'text-gray-500 dark:text-white/50 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} />
                    </div>
                    <p className={`font-bold text-lg mb-1 transition-colors ${file ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                        {file ? file.name : 'Click to select Excel file'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium font-mono">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports multi-sheet import (May/Aug/Dec)'}
                    </p>
                </label>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Effective Year</label>
                <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-gray-100/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                />
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-sm ${!file || uploading
                        ? 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-white/30 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:-translate-y-0.5'
                        }`}
                >
                    {uploading ? (
                        <span className="flex items-center gap-2">
                            <Layers className="w-5 h-5 animate-bounce" /> Importing...
                        </span>
                    ) : 'Start Import'}
                </button>
            </div>
        </div>
    );
}
