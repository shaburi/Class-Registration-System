import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    RefreshCw,
    Plus,
    Edit,
    Trash2,
    Clock,
    Copy,
    Archive,
    Shield
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../ui/Modal';
import { showGlassToast } from '../GlassToast';

// Sessions Management Component for HOP
export default function SessionsManagement({ onRefresh }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        start_date: '',
        end_date: '',
        status: 'upcoming',
        clone_from_session_id: ''
    });
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const res = await api.get('/sessions');
            setSessions(res.data.data || []);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (!payload.clone_from_session_id) {
                delete payload.clone_from_session_id;
            }
            const res = await api.post('/sessions', payload);
            showGlassToast.success(res.data.message);
            setShowCreateModal(false);
            setFormData({ code: '', name: '', start_date: '', end_date: '', status: 'upcoming', clone_from_session_id: '' });
            loadSessions();
            if (onRefresh) onRefresh();
        } catch (error) {
            showGlassToast.error('Failed to create session: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/sessions/${editingSession.id}`, formData);
            setEditingSession(null);
            setFormData({ code: '', name: '', start_date: '', end_date: '', status: 'upcoming', clone_from_session_id: '' });
            loadSessions();
            if (onRefresh) onRefresh();
        } catch (error) {
            showGlassToast.error('Failed to update session: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleActivate = async (sessionId) => {
        setConfirmModal({
            open: true,
            title: 'Activate Session',
            message: 'This will archive all other sessions and activate this one. Continue?',
            onConfirm: async () => {
                try {
                    await api.put(`/sessions/${sessionId}/activate`);
                    loadSessions();
                    if (onRefresh) onRefresh();
                    showGlassToast.success('Session activated successfully');
                } catch (error) {
                    showGlassToast.error('Failed to activate session: ' + (error.response?.data?.message || error.message));
                }
            }
        });
    };

    const handleArchive = async (sessionId) => {
        setConfirmModal({
            open: true,
            title: 'Archive Session',
            message: 'Archive this session?',
            onConfirm: async () => {
                try {
                    await api.put(`/sessions/${sessionId}/archive`);
                    loadSessions();
                    if (onRefresh) onRefresh();
                    showGlassToast.success('Session archived successfully');
                } catch (error) {
                    showGlassToast.error('Failed to archive session: ' + (error.response?.data?.message || error.message));
                }
            }
        });
    };

    const handleDelete = async (sessionId) => {
        setConfirmModal({
            open: true,
            title: '⚠️ Delete Session',
            message: 'Delete this session? This cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/sessions/${sessionId}`);
                    loadSessions();
                    if (onRefresh) onRefresh();
                    showGlassToast.success('Session deleted successfully');
                } catch (error) {
                    showGlassToast.error('Failed to delete session: ' + (error.response?.data?.message || error.message));
                }
            }
        });
    };

    const openEditModal = (session) => {
        setEditingSession(session);
        setFormData({
            code: session.code,
            name: session.name,
            start_date: session.start_date?.split('T')[0] || '',
            end_date: session.end_date?.split('T')[0] || '',
            status: session.status
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return (
                    <div className="relative inline-flex group/badge">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-sm group-hover/badge:blur-md transition-all duration-300" />
                        <span className="relative px-3 py-1 flex items-center gap-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                        </span>
                    </div>
                );
            case 'upcoming':
                return (
                    <div className="relative inline-flex group/badge">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm group-hover/badge:blur-md transition-all duration-300" />
                        <span className="relative px-3 py-1 flex items-center gap-1.5 text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full">
                            <Clock size={12} className="text-blue-500 dark:text-blue-400" />
                            Upcoming
                        </span>
                    </div>
                );
            case 'archived':
                return (
                    <div className="relative inline-flex">
                        <span className="relative px-3 py-1 flex items-center gap-1.5 text-xs font-bold bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 rounded-full">
                            <Archive size={12} className="text-gray-500 dark:text-gray-400" />
                            Archived
                        </span>
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                    <RefreshCw className="w-10 h-10 animate-spin relative z-10 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">Loading sessions...</p>
            </div>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/70 tracking-tight flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                            Academic Sessions
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 ml-14 font-medium">Manage registration periods and system-wide academic terms.</p>
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="group relative overflow-hidden flex items-center justify-center w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 text-sm transition-all duration-300 border border-white/20"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
                            <Plus size={20} className="relative z-10 transition-transform group-hover:rotate-90" />
                            <span className="ml-2 font-bold uppercase tracking-wider relative z-10">Create Session</span>
                        </button>
                    </div>
                </div>

                {sessions.length === 0 ? (
                    <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />

                        <div className="relative z-10 w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500/10 to-red-500/10 dark:from-white/5 dark:to-white/5 border border-blue-500/20 dark:border-white/10 flex items-center justify-center mb-6 shadow-inner">
                            <Calendar size={40} className="text-blue-500 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                        </div>
                        <h3 className="relative z-10 text-2xl font-black text-gray-900 dark:text-white mb-3">No Sessions Yet</h3>
                        <p className="relative z-10 text-gray-500 dark:text-gray-400 max-w-md mx-auto font-medium leading-relaxed">
                            You have not created any academic sessions. Create your first session to allow students to register for courses.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {sessions.map((session, idx) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: idx * 0.1, duration: 0.4 }}
                                className="group relative rounded-3xl p-6 md:p-8 bg-white/60 dark:bg-[#11131e]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.15)] dark:hover:shadow-[0_12px_40px_rgba(37,99,235,0.3)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                            >
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${session.status === 'active' ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5' :
                                    session.status === 'upcoming' ? 'bg-gradient-to-br from-blue-500/5 to-blue-600/5' :
                                        'bg-gradient-to-br from-gray-500/5 to-slate-500/5'
                                    }`} />

                                <div className={`absolute -inset-[1px] rounded-3xl border border-transparent transition-colors duration-500 pointer-events-none ${session.status === 'active' ? 'group-hover:border-emerald-500/30' :
                                    session.status === 'upcoming' ? 'group-hover:border-blue-500/30' :
                                        'group-hover:border-gray-500/30'
                                    }`} />

                                <div className="flex flex-col h-full relative z-10">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${session.status === 'active' ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' :
                                                session.status === 'upcoming' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]' :
                                                    'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10'
                                                }`}>
                                                <Calendar className={session.status === 'archived' ? 'opacity-50' : ''} size={24} strokeWidth={session.status !== 'archived' ? 2.5 : 2} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{session.code}</h4>
                                                {getStatusBadge(session.status)}
                                            </div>
                                        </div>

                                        {/* Action Menu (Top Right) */}
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => openEditModal(session)}
                                                className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 transition-colors shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-white/10 backdrop-blur-md"
                                                title="Edit Session"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(session.id)}
                                                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shadow-sm border border-transparent hover:border-red-200 dark:hover:border-red-500/20 backdrop-blur-md"
                                                title="Delete Session"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-grow mb-6">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed border-l-2 border-blue-500/30 pl-3">
                                            {session.name}
                                        </p>

                                        {session.start_date && (
                                            <div className="flex items-center gap-3 bg-gray-50/50 dark:bg-black/20 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                                <div className="p-1.5 bg-white dark:bg-white/10 rounded-lg shrink-0">
                                                    <Calendar size={14} className="text-gray-500 dark:text-gray-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duration</span>
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                        {new Date(session.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        <span className="mx-2 text-gray-300 dark:text-gray-600">→</span>
                                                        {new Date(session.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-5 border-t border-gray-200/50 dark:border-white/10 flex items-center justify-end gap-3">
                                        {session.status !== 'active' && (
                                            <button
                                                onClick={() => handleActivate(session.id)}
                                                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0 border border-white/20 w-full sm:w-auto text-center flex-1 sm:flex-none justify-center"
                                            >
                                                Set as Active
                                            </button>
                                        )}
                                        {session.status === 'active' && (
                                            <button
                                                onClick={() => handleArchive(session.id)}
                                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all shadow-sm border border-gray-200 dark:border-white/10 w-full sm:w-auto text-center flex-1 sm:flex-none justify-center"
                                            >
                                                Archive
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                <Modal
                    isOpen={showCreateModal || editingSession !== null}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingSession(null);
                        setFormData({ code: '', name: '', start_date: '', end_date: '', status: 'upcoming', clone_from_session_id: '' });
                    }}
                    title={editingSession ? 'Edit Session' : 'Create New Session'}
                >
                    <form onSubmit={editingSession ? handleUpdate : handleCreate} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                Session Code <span className="text-gray-400 font-normal">(e.g., 1225, 0526)</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="0526"
                                    required
                                    disabled={editingSession}
                                    className="relative w-full px-4 py-3 bg-white/50 dark:bg-[#07090e]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-0 focus:border-blue-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all font-medium disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                Session Name
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="May 2026 - September 2026"
                                    required
                                    className="relative w-full px-4 py-3 bg-white/50 dark:bg-[#07090e]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-0 focus:border-blue-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    Start Date
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="relative w-full px-4 py-3 bg-white/50 dark:bg-[#07090e]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-0 focus:border-blue-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all font-medium [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    End Date
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="relative w-full px-4 py-3 bg-white/50 dark:bg-[#07090e]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-0 focus:border-blue-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all font-medium [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Clone from existing session (only for new sessions) */}
                        {!editingSession && sessions.length > 0 && (
                            <div className="relative overflow-hidden bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5 backdrop-blur-md mt-6">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                                <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                                    <Copy size={16} /> Optional: Clone Existing Session
                                </label>
                                <select
                                    value={formData.clone_from_session_id}
                                    onChange={(e) => setFormData({ ...formData, clone_from_session_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/80 dark:bg-[#07090e]/80 border border-blue-200 dark:border-blue-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 dark:text-white font-medium"
                                >
                                    <option value="" className="text-gray-500 dark:text-gray-400">Don't clone - Start fresh</option>
                                    {sessions.map((s) => (
                                        <option key={s.id} value={s.id} className="text-gray-900 dark:text-white">
                                            {s.code} - {s.name} ({s.status})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70 mt-2 flex items-start gap-1">
                                    <span className="text-blue-500">*</span>
                                    Copies all sections, schedules, and lecturer assignments into your new session.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-white/10 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setEditingSession(null);
                                    setFormData({ code: '', name: '', start_date: '', end_date: '', status: 'upcoming', clone_from_session_id: '' });
                                }}
                                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="relative overflow-hidden group px-8 py-2.5 bg-gradient-to-r from-blue-600 to-red-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-0.5"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
                                <span className="relative z-10">{editingSession ? 'Save Changes' : 'Create Session'}</span>
                            </button>
                        </div>
                    </form>

                </Modal>
            </motion.div>

            {/* Confirmation Modal - portaled to body for proper centering */}
            {createPortal(
                <AnimatePresence>
                    {confirmModal.open && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                            onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-md bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col items-center text-center mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-3">
                                            <Shield className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{confirmModal.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6 text-center">{confirmModal.message}</p>
                                    <div className="flex justify-center gap-3">
                                        <button
                                            onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })}
                                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                const fn = confirmModal.onConfirm;
                                                setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
                                                fn && fn();
                                            }}
                                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/30 transition-all"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

