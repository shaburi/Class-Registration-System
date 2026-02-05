import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Calendar,
    Filter,
    RefreshCw,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    FileText,
    ArrowDownCircle,
    ArrowUpCircle,
    ArrowRightLeft,
    UserPlus,
    Clock,
    BookOpen,
    Users,
    X
} from 'lucide-react';
import api from '../../services/api';

const StudentLogsTab = () => {
    const [logs, setLogs] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [filters, setFilters] = useState({
        action_type: 'all',
        start_date: '',
        end_date: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 0
    });
    const [showFilters, setShowFilters] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    // Fetch list of all students
    const fetchStudents = useCallback(async () => {
        setLoadingStudents(true);
        try {
            const response = await api.get('/hop/students');
            setStudents(response.data.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch students:', error);
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    // Fetch logs for selected student
    const fetchLogs = useCallback(async () => {
        if (!selectedStudent) {
            setLogs([]);
            setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                student_search: selectedStudent.student_id || selectedStudent.student_name,
                ...(filters.action_type !== 'all' && { action_type: filters.action_type }),
                ...(filters.start_date && { start_date: filters.start_date }),
                ...(filters.end_date && { end_date: filters.end_date })
            });

            const response = await api.get(`/hop/student-logs?${params}`);
            const data = response.data.data;
            setLogs(data.logs || []);
            setPagination(prev => ({
                ...prev,
                total: data.pagination?.total || 0,
                totalPages: data.pagination?.totalPages || 0
            }));
        } catch (error) {
            console.error('Failed to fetch student logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [selectedStudent, filters, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleStudentSelect = (student) => {
        setSelectedStudent(student);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const filteredStudents = students.filter(student =>
        student.student_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const getActionBadge = (actionType) => {
        const badges = {
            registration: {
                icon: <ArrowUpCircle size={14} />,
                text: 'Registration',
                className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
            },
            drop: {
                icon: <ArrowDownCircle size={14} />,
                text: 'Drop',
                className: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]'
            },
            swap: {
                icon: <ArrowRightLeft size={14} />,
                text: 'Swap',
                className: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
            },
            manual_join: {
                icon: <UserPlus size={14} />,
                text: 'Manual',
                className: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]'
            }
        };

        const badge = badges[actionType] || {
            icon: <FileText size={14} />,
            text: actionType,
            className: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        };

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${badge.className}`}>
                {badge.icon}
                {badge.text}
            </span>
        );
    };

    const getStatusBadge = (status) => {
        if (!status) return null;

        const statusStyles = {
            pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]',
            approved: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]',
            rejected: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
            cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-md ${statusStyles[status] || statusStyles.pending}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${status === 'pending' ? 'bg-yellow-400 animate-pulse' : status === 'approved' ? 'bg-green-400' : 'bg-red-400'}`} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatTime = (time) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex gap-8 h-[calc(100vh-140px)]">
            {/* Student List Sidebar */}
            <div className="w-80 flex-shrink-0 glass-card rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-2xl bg-black/40 backdrop-blur-2xl">
                <div className="p-6 border-b border-white/5 bg-white/5">
                    <h3 className="font-bold text-lg text-white flex items-center gap-3 mb-5">
                        <Users size={20} className="text-indigo-400" />
                        Students
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60 font-medium">
                            {students.length}
                        </span>
                    </h3>
                    <div className="relative group">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a student..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {loadingStudents ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-white/40">Loading students...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                <Users size={20} className="text-white/20" />
                            </div>
                            <p className="text-white/40 text-sm">No students found</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {filteredStudents.map((student, index) => (
                                <motion.button
                                    key={student.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => handleStudentSelect(student)}
                                    className={`w-full p-3.5 rounded-2xl text-left transition-all duration-300 group relative ${selectedStudent?.id === student.id
                                        ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-white/10 shadow-lg'
                                        : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                                        }`}
                                >
                                    {selectedStudent?.id === student.id && (
                                        <motion.div
                                            layoutId="activeGlow"
                                            className="absolute inset-0 rounded-2xl bg-indigo-500/10 blur-xl"
                                        />
                                    )}
                                    <div className="relative flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${selectedStudent?.id === student.id
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30'
                                            : 'bg-gradient-to-br from-gray-800 to-gray-900 text-white/60 group-hover:text-white group-hover:scale-105 transition-transform'
                                            }`}>
                                            {student.student_name?.charAt(0) || 'S'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold truncate transition-colors ${selectedStudent?.id === student.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                                                }`}>
                                                {student.student_name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                                                    {student.student_id}
                                                </span>
                                                <span className="text-xs text-white/40 border-l border-white/10 pl-2">
                                                    Sem {student.semester}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Logs Panel */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Section */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        {selectedStudent ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-6"
                            >
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-2xl shadow-indigo-500/20">
                                    <div className="w-full h-full rounded-3xl bg-black/40 backdrop-blur-md flex items-center justify-center">
                                        <span className="text-3xl font-bold text-white">
                                            {selectedStudent.student_name?.charAt(0) || 'S'}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
                                        {selectedStudent.student_name}
                                    </h2>
                                    <div className="flex items-center gap-2 text-white/50 text-base">
                                        <span className="font-mono">{selectedStudent.student_id}</span>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span>{selectedStudent.programme}</span>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span>Semester {selectedStudent.semester}</span>
                                        <span className="ml-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 backdrop-blur-md shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                            Active Student
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <h2 className="text-3xl font-bold text-white tracking-tight">Activity Logs</h2>
                                <p className="text-white/50 text-lg">Select a student from the list to view their history</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${showFilters
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <Filter size={18} className="transition-transform group-hover:scale-110" />
                            Filters
                        </button>
                        <button
                            onClick={fetchLogs}
                            disabled={loading || !selectedStudent}
                            className="p-3 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                        >
                            <RefreshCw size={18} className={`transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        {selectedStudent && (
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/10"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Collapse */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="glass-card p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
                                <div className="grid grid-cols-4 gap-6">
                                    <div className="col-span-1">
                                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">Action Type</label>
                                        <div className="relative">
                                            <select
                                                value={filters.action_type}
                                                onChange={(e) => handleFilterChange('action_type', e.target.value)}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/50"
                                            >
                                                <option value="all" className="bg-gray-900">All Actions</option>
                                                <option value="registration" className="bg-gray-900">Registrations</option>
                                                <option value="drop" className="bg-gray-900">Drops</option>
                                                <option value="swap" className="bg-gray-900">Swaps</option>
                                                <option value="manual_join" className="bg-gray-900">Manual Joins</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">From Date</label>
                                        <input
                                            type="date"
                                            value={filters.start_date}
                                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">To Date</label>
                                        <input
                                            type="date"
                                            value={filters.end_date}
                                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="col-span-1 flex items-end">
                                        <button
                                            onClick={() => setFilters({ action_type: 'all', start_date: '', end_date: '' })}
                                            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <X size={14} /> Clear Filters
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats Grid */}
                {selectedStudent && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Registrations', icon: <ArrowUpCircle size={20} />, count: logs.filter(l => l.action_type === 'registration').length, color: 'emerald' },
                            { label: 'Drop Requests', icon: <ArrowDownCircle size={20} />, count: logs.filter(l => l.action_type === 'drop').length, color: 'orange' },
                            { label: 'Swaps', icon: <ArrowRightLeft size={20} />, count: logs.filter(l => l.action_type === 'swap').length, color: 'blue' },
                            { label: 'Manual Joins', icon: <UserPlus size={20} />, count: logs.filter(l => l.action_type === 'manual_join').length, color: 'purple' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card p-5 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 overflow-hidden relative group hover:border-white/10 transition-colors"
                            >
                                <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${stat.color}-500/10 rounded-full blur-2xl group-hover:bg-${stat.color}-500/20 transition-colors`} />
                                <div className="relative z-10">
                                    <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-400 mb-3 group-hover:scale-110 transition-transform`}>
                                        {stat.icon}
                                    </div>
                                    <p className="text-3xl font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">{stat.count}</p>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{stat.label}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Data Table */}
                <div className="flex-1 glass-card rounded-3xl overflow-hidden flex flex-col border border-white/10 bg-black/40 backdrop-blur-2xl shadow-xl">
                    {!selectedStudent ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-xl animate-pulse" />
                                <Users size={40} className="text-white/30 relative z-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Select a Student</h3>
                            <p className="text-white/40 max-w-sm">
                                Choose a student from the sidebar to view their detailed activity logs and history.
                            </p>
                        </div>
                    ) : loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-white/40 animate-pulse">Fetching records...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                <FileText size={32} className="text-white/20" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Records Found</h3>
                            <p className="text-white/40">
                                This student hasn't performed any activities for the selected period.
                            </p>
                            <button
                                onClick={() => setFilters({ action_type: 'all', start_date: '', end_date: '' })}
                                className="mt-6 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-black/40 backdrop-blur-xl z-10">
                                        <tr>
                                            {['Date & Time', 'Action', 'Subject', 'Section', 'Schedule', 'Status'].map((header) => (
                                                <th key={header} className="px-6 py-4 text-left text-xs font-bold text-white/30 uppercase tracking-widest border-b border-white/5">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {logs.map((log, index) => (
                                            <motion.tr
                                                key={`${log.action_type}-${log.id}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className="group hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-white font-medium mb-0.5">
                                                            {formatDate(log.created_at).split(',')[0]}
                                                        </span>
                                                        <span className="text-xs font-mono text-white/40 flex items-center gap-1.5">
                                                            <Clock size={10} />
                                                            {formatDate(log.created_at).split(',')[1]}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getActionBadge(log.action_type)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white/80 transition-colors">
                                                            <BookOpen size={14} />
                                                        </div>
                                                        <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{log.subject_code}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-xs text-white/60 font-mono">
                                                        {log.section_number}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <span className="text-white/80 font-medium capitalize">{log.day}</span>
                                                        <span className="text-xs text-white/40 block mt-0.5 font-mono">
                                                            {formatTime(log.start_time)} - {formatTime(log.end_time)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(log.status)}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.01]">
                                <p className="text-xs text-white/40">
                                    Showing <span className="text-white">{logs.length}</span> of <span className="text-white">{pagination.total}</span> records
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                        disabled={pagination.page === 1}
                                        className="p-2 rounded-lg hover:bg-white/5 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="flex items-center gap-1 px-2">
                                        <span className="text-sm font-medium text-white">{pagination.page}</span>
                                        <span className="text-sm text-white/30">/</span>
                                        <span className="text-sm text-white/30">{pagination.totalPages || 1}</span>
                                    </div>
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="p-2 rounded-lg hover:bg-white/5 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentLogsTab;
