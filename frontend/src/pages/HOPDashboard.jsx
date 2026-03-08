import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    Calendar,
    LogOut,
    RefreshCw,
    Plus,
    Edit,
    Trash2,
    Shield,
    X,
    Printer,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
    Clock,
    ChevronDown,
    Upload,
    Search,
    Layers,
    Copy,
    Archive
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import PrintStudentList from '../components/PrintStudentList';
import { exportStudentsToExcel } from '../utils/excelExport';
import DashboardLayout from '../components/DashboardLayout';
import StatsCard from '../components/StatsCard';
import CSVImportModal from '../components/CSVImportModal';
import SubjectImportModal from '../components/SubjectImportModal';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import EdupageDataView from '../components/EdupageDataView';
import StudentLogsTab from '../components/hop/StudentLogsTab';
import ProgramStructureManager from '../components/hop/ProgramStructureManager';
import SubjectsTab from '../components/hop/SubjectsTab';
import SectionsTab from '../components/hop/SectionsTab';
import TimetableTab from '../components/hop/TimetableTab';
import SessionsManagement from '../components/hop/SessionsManagement';
import { showGlassToast } from '../components/GlassToast';


export default function HOPDashboard() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [subjects, setSubjects] = useState([]);
    const [sections, setSections] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewingStudents, setViewingStudents] = useState(null);
    const [sectionStudents, setSectionStudents] = useState([]);
    const [dropRequests, setDropRequests] = useState([]);
    const [manualRequests, setManualRequests] = useState([]);
    const [printMode, setPrintMode] = useState(false);
    const [printSection, setPrintSection] = useState(null);
    const [printStudents, setPrintStudents] = useState([]);
    const [subjectProgrammeMap, setSubjectProgrammeMap] = useState({});

    // CSV Import Modal States
    const [showSubjectsImport, setShowSubjectsImport] = useState(false);
    const [showSubjectFileImport, setShowSubjectFileImport] = useState(false);
    const [showSectionsImport, setShowSectionsImport] = useState(false);
    const [showLecturerAssignImport, setShowLecturerAssignImport] = useState(false);
    const [importing, setImporting] = useState(false);

    // Custom modal states (replaces native alert/prompt/confirm)
    const [rejectModal, setRejectModal] = useState({ open: false, type: null, requestId: null });
    const [rejectReason, setRejectReason] = useState('');
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [subjectsRes, sectionsRes, lecturersRes, statsRes, dropReqRes, manualReqRes, mappingRes] = await Promise.all([
                api.get('/hop/subjects'),
                api.get('/hop/sections'),
                api.get('/hop/lecturers'),
                api.get('/hop/statistics'),
                api.get('/hop/drop-requests/pending'),
                api.get('/hop/manual-join-requests?status=pending').catch(err => {
                    console.error('Manual requests API failed:', err);
                    return { data: { data: [] } };
                }),
                api.get('/program-structures/subject-mapping').catch(err => {
                    console.error('Subject mapping API failed:', err);
                    return { data: { data: {} } };
                })
            ]);

            // Backend returns { success, data }, so we need .data.data
            setSubjects(subjectsRes.data.data || subjectsRes.data || []);
            setSections(sectionsRes.data.data || sectionsRes.data || []);
            setLecturers(lecturersRes.data.data || lecturersRes.data || []);
            setStatistics(statsRes.data.data || statsRes.data || {});
            setDropRequests(dropReqRes.data.data || dropReqRes.data || []);
            setManualRequests(manualReqRes.data.data || manualReqRes.data || []);
            setSubjectProgrammeMap(mappingRes.data.data || mappingRes.data || {});
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null); // null means adding new
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState(null);

    const handleAddSubject = () => {
        setEditingSubject(null);
        setIsSubjectModalOpen(true);
    };

    const handleEditSubject = (id) => {
        const subject = subjects.find(s => s.id === id);
        if (subject) {
            setEditingSubject(subject);
            setIsSubjectModalOpen(true);
        }
    };

    const handleSaveSubject = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const subjectData = {
            code: formData.get('code'),
            name: formData.get('name'),
            creditHours: parseInt(formData.get('credit_hours')),
            programme: formData.get('programme'),
            semester: parseInt(formData.get('semester') || 1)
        };

        try {
            if (editingSubject) {
                // PUT /hop/subjects/:id (only name and creditHours can be updated)
                await api.put(`/hop/subjects/${editingSubject.id}`, {
                    name: subjectData.name,
                    credit_hours: subjectData.creditHours
                });
            } else {
                // POST /hop/subjects
                await api.post('/hop/subjects', subjectData);
            }
            await loadData(); // Refresh from server
            setIsSubjectModalOpen(false);
            setEditingSubject(null);
        } catch (error) {
            console.error('Backend API call failed, using demo mode:', error);
            // Fallback to demo mode
            const displayData = {
                code: subjectData.code,
                name: subjectData.name,
                credit_hours: subjectData.creditHours,
                programme: subjectData.programme,
                semester: subjectData.semester
            };
            if (editingSubject) {
                setSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, ...displayData } : s));
            } else {
                const newSubject = { id: Date.now(), ...displayData };
                setSubjects(prev => [...prev, newSubject]);
            }
            setIsSubjectModalOpen(false);
            setEditingSubject(null);
            showGlassToast.info('Saved locally (Demo Mode)');
        }
    };

    const handleDeleteSubject = async (id) => {
        setConfirmModal({
            open: true,
            title: 'Delete Subject',
            message: 'Are you sure you want to delete this subject?',
            onConfirm: async () => {
                try {
                    await api.delete(`/hop/subjects/${id}`);
                    await loadData();
                    showGlassToast.success('Subject deleted successfully');
                } catch (error) {
                    console.error('[DELETE] Backend API call failed:', error);
                    showGlassToast.error('Failed to delete subject: ' + (error.response?.data?.message || error.message));
                }
            }
        });
    };

    const handleDeleteAllSubjects = async () => {
        setConfirmModal({
            open: true,
            title: '⚠️ Delete ALL Subjects',
            message: `This will delete ALL ${subjects.length} subjects, sections, and registrations. This action cannot be undone!`,
            onConfirm: async () => {
                try {
                    await api.delete('/hop/subjects/all');
                    await loadData();
                    showGlassToast.success('All subjects deleted successfully');
                } catch (error) {
                    console.error('Delete all subjects error:', error);
                    showGlassToast.error('Failed to delete subjects: ' + (error.response?.data?.message || error.message));
                }
            }
        });
    };

    const handleAddSection = () => {
        setEditingSection(null);
        setIsSectionModalOpen(true);
    };

    const handleEditSection = (id) => {
        const section = sections.find(s => s.id === id);
        if (section) {
            setEditingSection(section);
            setIsSectionModalOpen(true);
        }
    };

    const handleSaveSection = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            if (editingSection) {
                // PUT /hop/sections/:id (editing) - use snake_case
                const updateData = {
                    section_number: formData.get('section_number'),
                    day: formData.get('day'),
                    start_time: formData.get('start_time'),
                    end_time: formData.get('end_time'),
                    room: formData.get('room'),
                    building: formData.get('building') || '',
                    capacity: parseInt(formData.get('capacity')),
                    lecturer_id: formData.get('lecturer_id') || null
                };
                await api.put(`/hop/sections/${editingSection.id}`, updateData);
            } else {
                // POST /hop/sections (adding new) - use camelCase and convert subject_code to subjectId
                const subjectCode = formData.get('subject_code');
                const subject = subjects.find(s => s.code === subjectCode);

                if (!subject) {
                    throw new Error('Subject not found');
                }

                const createData = {
                    subjectId: subject.id,
                    sectionNumber: formData.get('section_number'),
                    day: formData.get('day'),
                    startTime: formData.get('start_time'),
                    endTime: formData.get('end_time'),
                    room: formData.get('room'),
                    building: formData.get('building') || '',
                    capacity: parseInt(formData.get('capacity')),
                    lecturerId: formData.get('lecturer_id') || null
                };

                await api.post('/hop/sections', createData);
            }
            await loadData(); // Refresh from server
            setIsSectionModalOpen(false);
            setEditingSection(null);
        } catch (error) {
            console.error('[SECTION] Backend API call failed:', error);
            console.error('[SECTION] Error details:', error.response?.data);
            showGlassToast.error('Failed to save section: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteSection = async (id) => {
        setConfirmModal({
            open: true,
            title: 'Delete Section',
            message: 'Are you sure you want to delete this section?',
            onConfirm: async () => {
                try {
                    await api.delete(`/hop/sections/${id}`);
                    await loadData();
                    showGlassToast.success('Section deleted successfully');
                } catch (error) {
                    console.error('[DELETE SECTION] Backend API call failed:', error);
                    showGlassToast.error('Failed to delete section: ' + (error.response?.data?.message || error.message));
                }
            }
        });
    };

    const handleClearAllSections = async () => {
        setConfirmModal({
            open: true,
            title: '⚠️ Delete ALL Sections',
            message: `This will delete ALL ${sections.length} sections and their registrations. This action cannot be undone!`,
            onConfirm: async () => {
                try {
                    await api.delete('/hop/sections/all');
                    showGlassToast.success('Successfully deleted all sections');
                    await loadData();
                } catch (error) {
                    console.error('[CLEAR ALL] Failed:', error);
                    showGlassToast.error('Failed to clear sections: ' + (error.response?.data?.message || error.message));
                }
            }
        });
    };

    const handleViewStudents = async (sectionId) => {
        try {
            const response = await api.get(`/hop/sections/${sectionId}/students`);
            const students = response.data.data || response.data || [];
            const section = sections.find(s => s.id === sectionId);
            setViewingStudents(section);
            setSectionStudents(students);
        } catch (error) {
            console.error('Failed to load students:', error);
            showGlassToast.error('Failed to load students: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleApproveDropRequest = async (requestId) => {
        try {
            await api.post(`/hop/drop-requests/${requestId}/approve`);
            await loadData();
            showGlassToast.success('Drop request approved! Student has been dropped from the section.');
        } catch (error) {
            console.error('Approve drop request failed:', error);
            showGlassToast.error(error.response?.data?.message || 'Failed to approve drop request');
        }
    };

    const handleRejectDropRequest = (requestId) => {
        setRejectReason('');
        setRejectModal({ open: true, type: 'drop', requestId });
    };

    const handleConfirmReject = async () => {
        if (!rejectReason.trim()) {
            showGlassToast.error('Please provide a reason for rejection');
            return;
        }

        const { type, requestId } = rejectModal;
        setRejectModal({ open: false, type: null, requestId: null });

        try {
            if (type === 'drop') {
                await api.post(`/hop/drop-requests/${requestId}/reject`, {
                    rejection_reason: rejectReason
                });
                showGlassToast.success('Drop request rejected.');
            } else if (type === 'manual') {
                await api.put(`/hop/manual-join-requests/${requestId}/reject`, {
                    rejectionReason: rejectReason
                });
                showGlassToast.success('Manual join request rejected.');
            }
            await loadData();
        } catch (error) {
            console.error('Reject request failed:', error);
            showGlassToast.error(error.response?.data?.message || 'Failed to reject request');
        }
    };

    // Manual Join Request Handlers
    const handleApproveManualRequest = async (requestId) => {
        try {
            await api.put(`/hop/manual-join-requests/${requestId}/approve`, {
                approvalReason: 'Approved by HOP'
            });
            await loadData();
            showGlassToast.success('Manual join request approved! Student has been added to the section.');
        } catch (error) {
            console.error('Approve manual request failed:', error);
            showGlassToast.error(error.response?.data?.message || 'Failed to approve request');
        }
    };

    const handleRejectManualRequest = (requestId) => {
        setRejectReason('');
        setRejectModal({ open: true, type: 'manual', requestId });
    };

    const handlePrintStudents = async (sectionId) => {
        try {
            const response = await api.get(`/hop/sections/${sectionId}/students`);
            const students = response.data.data || response.data || [];
            const section = sections.find(s => s.id === sectionId);

            setPrintSection(section);
            setPrintStudents(students);
            setPrintMode(true);
        } catch (error) {
            console.error('Failed to load students for printing:', error);
            showGlassToast.error('Failed to load students: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleExportExcel = async (sectionId) => {
        try {
            const response = await api.get(`/hop/sections/${sectionId}/students`);
            const students = response.data.data || response.data || [];
            const section = sections.find(s => s.id === sectionId);

            exportStudentsToExcel(section, students);
        } catch (error) {
            console.error('Failed to export students:', error);
            showGlassToast.error('Failed to export: ' + (error.response?.data?.message || error.message));
        }
    };

    // ============================================================================
    // CSV IMPORT HANDLERS
    // ============================================================================

    const handleSubjectsImport = async (data) => {
        setImporting(true);
        try {
            const response = await api.post('/hop/subjects/import', { subjects: data });
            showGlassToast.success(response.data.message);
            setShowSubjectsImport(false);
            loadData(); // Refresh data
        } catch (error) {
            showGlassToast.error('Import failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setImporting(false);
        }
    };

    const handleSectionsImport = async (data) => {
        setImporting(true);
        try {
            const response = await api.post('/hop/sections/import', { sections: data });
            showGlassToast.success(response.data.message);
            setShowSectionsImport(false);
            loadData(); // Refresh data
        } catch (error) {
            showGlassToast.error('Import failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setImporting(false);
        }
    };

    const handleLecturerAssignImport = async (data) => {
        setImporting(true);
        try {
            const response = await api.post('/hop/lecturers/assign-bulk', { assignments: data });
            showGlassToast.success(response.data.message);
            setShowLecturerAssignImport(false);
            loadData(); // Refresh data
        } catch (error) {
            showGlassToast.error('Import failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setImporting(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-red-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const displayName = user?.displayName || user?.student_name || user?.studentName || user?.lecturerName || user?.lecturer_name || user?.hopName || user?.hop_name || user?.name || user?.email?.split('@')[0] || 'Administrator';
    const headerContent = (
        <div className="flex flex-col gap-2 relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-1 font-heading tracking-tight text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-lg">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 dark:from-blue-400 dark:via-red-400 dark:to-blue-400 animate-gradient-x">
                    Welcome back
                </span>
                , {displayName}
            </h2>
            <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                <p>Here is what's happening today.</p>
                <div className="hidden md:block w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                <div className="hidden md:block text-[11px] font-bold uppercase tracking-widest opacity-80 text-gray-500">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <DashboardLayout
                role="hop"
                title={`Head of Programme Dashboard${user?.programme ? ` â€” ${user.programme}` : ''}`}
                headerContent={headerContent}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                badges={{
                    'drop-requests': dropRequests.length,
                    'manual-requests': manualRequests.length
                }}
                notifications={[
                    ...(dropRequests.length > 0 ? [{
                        id: 'drop-requests',
                        title: 'Drop Requests',
                        message: `${dropRequests.length} pending drop request${dropRequests.length > 1 ? 's' : ''} awaiting review`,
                        type: 'warning',
                        read: false,
                        tabId: 'drop-requests'
                    }] : []),
                    ...(manualRequests.length > 0 ? [{
                        id: 'manual-requests',
                        title: 'Manual Join Requests',
                        message: `${manualRequests.length} pending manual join request${manualRequests.length > 1 ? 's' : ''} awaiting approval`,
                        type: 'info',
                        read: false,
                        tabId: 'manual-requests'
                    }] : [])
                ]}
                onNotificationClick={(notification) => setActiveTab(notification.tabId)}
            >
                {/* Main Content */}
                <div className="space-y-6">
                    {/* Statistics Cards */}
                    {statistics && (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <StatsCard
                                icon={<BookOpen className="w-6 h-6" />}
                                title="Total Subjects"
                                value={statistics.totalSubjects || subjects.length}
                                color="red"
                            />
                            <StatsCard
                                icon={<Calendar className="w-6 h-6" />}
                                title="Active Sections"
                                value={statistics.totalSections || sections.length}
                                color="rose"
                            />
                            <StatsCard
                                icon={<Users className="w-6 h-6" />}
                                title="Total Students"
                                value={statistics.totalStudents || 0}
                                color="blue"
                            />
                            <StatsCard
                                icon={<LayoutDashboard className="w-6 h-6" />}
                                title="Avg. Utilization"
                                value={`${statistics.averageUtilization || 0}%`}
                                color="cyan"
                            />
                        </div>
                    )}

                    {/* Tab Content */}
                    <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-gray-800">
                        {/* Only show tab title/header if needed or keep it clean since sidebar highlights active tab */}

                        {activeTab === 'overview' && (
                            <AnalyticsDashboard />
                        )}

                        {activeTab === 'subjects' && (
                            <SubjectsTab
                                subjects={subjects}
                                subjectProgrammeMap={subjectProgrammeMap}
                                onRefresh={loadData}
                                onAdd={handleAddSubject}
                                onEdit={handleEditSubject}
                                onDelete={handleDeleteSubject}
                                onDeleteAll={handleDeleteAllSubjects}
                                onImport={() => setShowSubjectsImport(true)}
                                onImportFile={() => setShowSubjectFileImport(true)}
                            />
                        )}

                        {activeTab === 'sections' && (
                            <SectionsTab
                                sections={sections}
                                subjects={subjects}
                                subjectProgrammeMap={subjectProgrammeMap}
                                onRefresh={loadData}
                                onAdd={handleAddSection}
                                onEdit={handleEditSection}
                                onDelete={handleDeleteSection}
                                onViewStudents={handleViewStudents}
                                onImport={() => setShowSectionsImport(true)}
                                onAssignLecturers={() => setShowLecturerAssignImport(true)}
                                onClearAll={handleClearAllSections}
                            />
                        )}

                        {activeTab === 'timetable' && (
                            <TimetableTab sections={sections} subjects={subjects} />
                        )}

                        {activeTab === 'drop-requests' && (
                            <div className="relative">
                                {/* Ambient background glow for this section */}
                                <div className="absolute -inset-10 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10 blur-3xl -z-10 rounded-[3rem] pointer-events-none"></div>

                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-between items-center mb-8 relative z-10"
                                >
                                    <div>
                                        <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 font-heading tracking-tight drop-shadow-sm">
                                            Pending Drop Requests
                                        </h3>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                                            Review and manage student course withdrawals
                                        </p>
                                    </div>
                                    <motion.span
                                        whileHover={{ scale: 1.05 }}
                                        className="px-4 py-2 bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-bold shadow-[0_4px_15px_rgba(249,115,22,0.1)] dark:from-orange-900/40 dark:to-red-900/40 dark:border-orange-500/30 dark:text-orange-300 backdrop-blur-md flex items-center gap-2"
                                    >
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                        </span>
                                        {dropRequests.length} Pending
                                    </motion.span>
                                </motion.div >

                                {dropRequests.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                                    >
                                        <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-tr from-orange-100 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 flex items-center justify-center shadow-inner border border-white/60 dark:border-white/10">
                                            <Shield className="w-10 h-10 text-orange-400 dark:text-orange-500 opacity-80" />
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">All caught up!</h4>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">There are no pending drop requests at the moment. Enjoy your day.</p>
                                    </motion.div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-5">
                                        <AnimatePresence>
                                            {dropRequests.map((request, index) => (
                                                <motion.div
                                                    key={request.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                                                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                                                    whileHover={{ y: -4, scale: 1.01 }}
                                                    className="group relative bg-white/60 dark:bg-[#0f111a]/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[24px] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(249,115,22,0.15)] dark:hover:shadow-[0_12px_40px_rgba(249,115,22,0.2)]"
                                                >
                                                    {/* Animated glowing border stroke that follows hover */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-orange-400/0 to-orange-400/0 group-hover:from-orange-500/20 group-hover:via-red-500/20 group-hover:to-orange-500/20 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none rounded-[24px]"></div>

                                                    <div className="relative bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-900/80 dark:to-black/40 rounded-[20px] p-5 sm:p-6 h-full border border-white/40 dark:border-white/5">
                                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">

                                                            <div className="flex-1 w-full relative z-10">
                                                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30 ring-2 ring-white/50 dark:ring-black/50 overflow-hidden shrink-0">
                                                                        {request.student_name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                                                            {request.student_name}
                                                                            <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 rounded-md border border-gray-200 dark:border-white/10 uppercase tracking-widest block sm:inline-block mt-1 sm:mt-0">
                                                                                {request.student_number}
                                                                            </span>
                                                                        </h4>
                                                                        <p className="text-xs text-gray-400 font-medium tracking-wide mt-1 flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" />
                                                                            Requested {new Date(request.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="mb-4 pl-0 sm:pl-13">
                                                                    <div className="inline-flex items-center gap-2 mb-3 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20">
                                                                        <BookOpen className="w-4 h-4 text-red-500" />
                                                                        <span className="text-sm font-semibold tracking-wide text-red-700 dark:text-red-400">
                                                                            {request.subject_code} - {request.subject_name} <span className="opacity-70">(Sec {request.section_number})</span>
                                                                        </span>
                                                                    </div>

                                                                    <div className="relative">
                                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-red-400 rounded-full opacity-50"></div>
                                                                        <div className="pl-4">
                                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Reason for Dropping</p>
                                                                            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-medium bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-white/60 dark:border-white/5 backdrop-blur-sm shadow-inner group-hover:bg-white/80 dark:group-hover:bg-white/5 transition-colors">
                                                                                "{request.reason}"
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex flex-row sm:flex-col gap-3 w-full sm:w-auto relative z-10 sm:min-w-[140px] mt-4 sm:mt-0 shrink-0">
                                                                <motion.button
                                                                    whileHover={{ scale: 1.03 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => handleApproveDropRequest(request.id)}
                                                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-300 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50 border border-emerald-400/50"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    <span>Approve</span>
                                                                </motion.button>

                                                                <motion.button
                                                                    whileHover={{ scale: 1.03 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => handleRejectDropRequest(request.id)}
                                                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 bg-white dark:bg-white/5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40 shadow-sm"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                    <span>Reject</span>
                                                                </motion.button>
                                                            </div>

                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'manual-requests' && (
                            <div className="relative">
                                {/* Ambient background glow for this section */}
                                <div className="absolute -inset-10 bg-gradient-to-br from-red-500/10 via-transparent to-rose-500/10 blur-3xl -z-10 rounded-[3rem] pointer-events-none"></div>

                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-between items-center mb-8 relative z-10"
                                >
                                    <div>
                                        <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400 font-heading tracking-tight drop-shadow-sm">
                                            Manual Join Requests
                                        </h3>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                                            Review student requests to join full or restricted sections
                                        </p>
                                    </div>
                                    <motion.span
                                        whileHover={{ scale: 1.05 }}
                                        className="px-4 py-2 bg-gradient-to-r from-red-100 to-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold shadow-[0_4px_15px_rgba(220,38,38,0.1)] dark:from-red-900/40 dark:to-rose-900/40 dark:border-red-500/30 dark:text-red-300 backdrop-blur-md flex items-center gap-2"
                                    >
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                        {manualRequests.length} Pending
                                    </motion.span>
                                </motion.div>

                                {manualRequests.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                                    >
                                        <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-tr from-red-100 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 flex items-center justify-center shadow-inner border border-white/60 dark:border-white/10">
                                            <Clock className="w-10 h-10 text-red-400 dark:text-red-500 opacity-80" />
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No pending requests</h4>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">There are no manual join requests waiting for your approval right now.</p>
                                    </motion.div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-5">
                                        <AnimatePresence>
                                            {manualRequests.map((request, index) => (
                                                <motion.div
                                                    key={request.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                                                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                                                    whileHover={{ y: -4, scale: 1.01 }}
                                                    className="group relative bg-white/60 dark:bg-[#0f111a]/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[24px] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(220,38,38,0.15)] dark:hover:shadow-[0_12px_40px_rgba(220,38,38,0.2)]"
                                                >
                                                    {/* Animated glowing border stroke that follows hover */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/0 via-red-400/0 to-red-400/0 group-hover:from-red-500/20 group-hover:via-rose-500/20 group-hover:to-red-500/20 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none rounded-[24px]"></div>

                                                    <div className="relative bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-900/80 dark:to-black/40 rounded-[20px] p-5 sm:p-6 h-full border border-white/40 dark:border-white/5">
                                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                                                            <div className="flex-1 w-full relative z-10">
                                                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/30 ring-2 ring-white/50 dark:ring-black/50 overflow-hidden shrink-0">
                                                                        {request.student_name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                                                            {request.student_name}
                                                                            <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 rounded-md border border-gray-200 dark:border-white/10 uppercase tracking-widest block sm:inline-block mt-1 sm:mt-0">
                                                                                {request.student_id}
                                                                            </span>
                                                                        </h4>
                                                                        <p className="text-xs text-gray-400 font-medium tracking-wide mt-1 flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" />
                                                                            Requested {new Date(request.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="mb-4 pl-0 sm:pl-13">
                                                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                                                        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                                                            <BookOpen className="w-4 h-4 text-blue-500" />
                                                                            <span className="text-sm font-semibold tracking-wide text-blue-700 dark:text-blue-400">
                                                                                {request.subject_code} - {request.subject_name} <span className="opacity-70">(Sec {request.section_number})</span>
                                                                            </span>
                                                                        </div>
                                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                                                                            <Users className="w-4 h-4 text-gray-500" />
                                                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                                                Capacity: <span className="font-bold">{request.enrolled_count}/{request.capacity}</span>
                                                                            </span>
                                                                            {request.enrolled_count >= request.capacity && (
                                                                                <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold dark:bg-red-900/50 dark:text-red-300 shadow-sm border border-red-200 dark:border-red-800">
                                                                                    FULL
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="relative mt-4">
                                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-rose-400 rounded-full opacity-50"></div>
                                                                        <div className="pl-4">
                                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Reason for Joining</p>
                                                                            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-medium bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-white/60 dark:border-white/5 backdrop-blur-sm shadow-inner group-hover:bg-white/80 dark:group-hover:bg-white/5 transition-colors">
                                                                                "{request.reason}"
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex flex-row sm:flex-col gap-3 w-full sm:w-auto relative z-10 sm:min-w-[140px] mt-4 sm:mt-0 shrink-0">
                                                                <motion.button
                                                                    whileHover={{ scale: 1.03 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => handleApproveManualRequest(request.id)}
                                                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-300 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50 border border-emerald-400/50"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    <span>Approve</span>
                                                                </motion.button>

                                                                <motion.button
                                                                    whileHover={{ scale: 1.03 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => handleRejectManualRequest(request.id)}
                                                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 bg-white dark:bg-white/5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40 shadow-sm"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                    <span>Reject</span>
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'sessions' && (
                            <SessionsManagement onRefresh={loadData} />
                        )}

                        {activeTab === 'edupage' && (
                            <EdupageDataView />
                        )}

                        {activeTab === 'student-logs' && (
                            <StudentLogsTab />
                        )}

                        {activeTab === 'program-structures' && (
                            <ProgramStructureManager />
                        )}
                    </div>

                    {/* Subject Modal */}
                    < Modal
                        isOpen={isSubjectModalOpen}
                        onClose={() => setIsSubjectModalOpen(false)}
                        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
                    >
                        <form onSubmit={handleSaveSubject} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-1.5">Subject Code</label>
                                <input
                                    name="code"
                                    defaultValue={editingSubject?.code}
                                    required
                                    className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-blue-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-1.5">Subject Name</label>
                                <input
                                    name="name"
                                    defaultValue={editingSubject?.name}
                                    required
                                    className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-blue-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-1.5">Credit Hours</label>
                                    <input
                                        name="credit_hours"
                                        type="number"
                                        defaultValue={editingSubject?.credit_hours || 3}
                                        required
                                        min="1"
                                        max="6"
                                        className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-blue-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-1.5">Semester</label>
                                    <select
                                        name="semester"
                                        defaultValue={editingSubject?.semester || 1}
                                        disabled={!!editingSubject}
                                        className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-blue-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3 disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-500 dark:disabled:text-white/30"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                            <option key={sem} value={sem} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Sem {sem}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-1.5">Programme</label>
                                    <select
                                        name="programme"
                                        defaultValue={editingSubject?.programme || 'CT206'}
                                        disabled={!!editingSubject}
                                        className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-blue-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3 disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-500 dark:disabled:text-white/30"
                                    >
                                        <option value="CT206" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">CT206 - Bachelor of IT (Cyber Security)</option>
                                        <option value="CT204" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">CT204 - Bachelor of IT (Computer App Development)</option>
                                        <option value="CC101" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">CC101 - Diploma in Computer Science</option>
                                        <option value="ALL" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">ALL - All Programmes</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setIsSubjectModalOpen(false)}>Cancel</Button>
                                <Button type="submit">{editingSubject ? 'Save Changes' : 'Add Subject'}</Button>
                            </div>
                        </form>
                    </Modal >

                    {/* Section Modal */}
                    < Modal
                        isOpen={isSectionModalOpen}
                        onClose={() => setIsSectionModalOpen(false)}
                        title={editingSection ? 'Edit Section Details' : 'Add New Section'}
                    >
                        <form onSubmit={handleSaveSection} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Subject Code</label>
                                {editingSection ? (
                                    <input
                                        name="subject_code"
                                        defaultValue={editingSection.subject_code}
                                        className="mt-1 block w-full rounded-xl border-white/10 bg-white/5 shadow-sm focus:ring-0 sm:text-sm border p-3 text-white/50"
                                        readOnly
                                    />
                                ) : (
                                    <select
                                        name="subject_code"
                                        required
                                        className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                    >
                                        <option value="">Select a subject</option>
                                        {subjects.map(subject => (
                                            <option key={subject.id} value={subject.code}>
                                                {subject.code} - {subject.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Section Number</label>
                                <input
                                    name="section_number"
                                    defaultValue={editingSection?.section_number || ''}
                                    placeholder="e.g., 01, 02, A, B"
                                    required
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1.5">Day</label>
                                    <select
                                        name="day"
                                        defaultValue={editingSection?.day || 'monday'}
                                        className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                    >
                                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(d => (
                                            <option key={d} value={d} className="capitalize">{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1.5">Start Time</label>
                                    <input
                                        name="start_time"
                                        type="time"
                                        defaultValue={editingSection?.start_time || '08:00'}
                                        required
                                        className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1.5">End Time</label>
                                    <input
                                        name="end_time"
                                        type="time"
                                        defaultValue={editingSection?.end_time || '10:00'}
                                        required
                                        className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1.5">Room</label>
                                    <input
                                        name="room"
                                        defaultValue={editingSection?.room || ''}
                                        required
                                        className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1.5">Building</label>
                                    <input
                                        name="building"
                                        defaultValue={editingSection?.building || ''}
                                        placeholder="Optional"
                                        className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1.5">Capacity</label>
                                    <input
                                        name="capacity"
                                        type="number"
                                        defaultValue={editingSection?.capacity || 30}
                                        required
                                        className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Lecturer (optional)</label>
                                <select
                                    name="lecturer_id"
                                    defaultValue={editingSection?.lecturer_id || ''}
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 transition-all sm:text-sm p-3"
                                >
                                    <option value="">-- No Lecturer Assigned --</option>
                                    {lecturers.map(lecturer => (
                                        <option key={lecturer.id} value={lecturer.id}>
                                            {lecturer.lecturer_name} ({lecturer.lecturer_id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setIsSectionModalOpen(false)}>Cancel</Button>
                                <Button type="submit">{editingSection ? 'Save Changes' : 'Add Section'}</Button>
                            </div>
                        </form>
                    </Modal >

                    {/* Students Modal */}
                    < Modal
                        isOpen={viewingStudents !== null}
                        onClose={() => setViewingStudents(null)}
                        title={viewingStudents ? `Registered Students - ${viewingStudents.subject_code} Section ${viewingStudents.section_number}` : ''}
                    >
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                <p><strong>Subject:</strong> {viewingStudents?.subject_name}</p>
                                <p><strong>Enrolled:</strong> {sectionStudents.length} / {viewingStudents?.capacity}</p>
                            </div>

                            {/* Print Button */}
                            <button
                                onClick={() => {
                                    setViewingStudents(null);
                                    handlePrintStudents(viewingStudents?.id);
                                }}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Print Student List
                            </button>

                            {/* Excel Export Button */}
                            <button
                                onClick={() => {
                                    handleExportExcel(viewingStudents?.id);
                                }}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Download Excel
                            </button>

                            {sectionStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No students registered yet</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                    Student ID
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                    Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                    Email
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                    Registered
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                            {sectionStudents.map((student) => (
                                                <tr key={student.id}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        {student.student_id}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                        {student.student_name}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {student.email}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(student.registered_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </Modal >

                    {/* Print Modal */}
                    {
                        printMode && (
                            <div className="fixed inset-0 bg-white z-50">
                                <PrintStudentList
                                    section={printSection}
                                    students={printStudents}
                                    onClose={() => setPrintMode(false)}
                                />
                            </div>
                        )
                    }

                    {/* CSV Import Modals */}
                    <CSVImportModal
                        isOpen={showSubjectsImport}
                        onClose={() => setShowSubjectsImport(false)}
                        title="Import Subjects"
                        description="Upload a CSV file to bulk-add subjects"
                        templateColumns={['code', 'name', 'credit_hours', 'semester', 'programme']}
                        sampleData={[
                            { code: 'SWC2032', name: 'System Analysis & Design', credit_hours: 3, semester: 3, programme: 'CT206' },
                            { code: 'ESK5103', name: 'Technical Writing', credit_hours: 2, semester: 5, programme: 'CT206' }
                        ]}
                        requiredColumns={['code', 'name']}
                        onImport={handleSubjectsImport}
                        importing={importing}
                    />

                    {/* File Import Modal for Subjects (PDF, Excel, CSV) */}
                    <SubjectImportModal
                        isOpen={showSubjectFileImport}
                        onClose={() => setShowSubjectFileImport(false)}
                        onImportComplete={() => {
                            setShowSubjectFileImport(false);
                            loadData();
                        }}
                    />

                    <CSVImportModal
                        isOpen={showSectionsImport}
                        onClose={() => setShowSectionsImport(false)}
                        title="Import Sections"
                        description="Upload a CSV file to bulk-add sections"
                        templateColumns={['subject_code', 'section_number', 'day', 'start_time', 'end_time', 'room', 'capacity', 'lecturer_email']}
                        sampleData={[
                            { subject_code: 'SWC2032', section_number: '21', day: 'monday', start_time: '08:00:00', end_time: '10:00:00', room: 'LR3.2', capacity: 30, lecturer_email: 'lecturer@uptm.edu.my' }
                        ]}
                        requiredColumns={['subject_code', 'section_number', 'day']}
                        onImport={handleSectionsImport}
                        importing={importing}
                    />

                    <CSVImportModal
                        isOpen={showLecturerAssignImport}
                        onClose={() => setShowLecturerAssignImport(false)}
                        title="Assign Lecturers (Bulk)"
                        description="Upload a CSV file to assign lecturers to sections"
                        templateColumns={['lecturer_email', 'subject_code', 'section_number']}
                        sampleData={[
                            { lecturer_email: 'lecturer1@uptm.edu.my', subject_code: 'SWC2032', section_number: '21' },
                            { lecturer_email: 'lecturer2@uptm.edu.my', subject_code: 'ESK5103', section_number: '33' }
                        ]}
                        requiredColumns={['lecturer_email', 'subject_code', 'section_number']}
                        onImport={handleLecturerAssignImport}
                        importing={importing}
                    />

                    {/* Rejection Reason Modal */}
                    {/* Confirmation Modal */}
                </div>
            </DashboardLayout>

            {/* Rejection Reason Modal - portaled to body for proper centering */}
            {
                createPortal(
                    <AnimatePresence>
                        {rejectModal.open && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                                onClick={() => setRejectModal({ open: false, type: null, requestId: null })}
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
                                            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-3">
                                                <XCircle className="w-6 h-6 text-red-500" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                Reject {rejectModal.type === 'drop' ? 'Drop' : 'Manual Join'} Request
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Provide a reason for rejection</p>
                                        </div>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Enter your reason for rejecting this request..."
                                            className="w-full h-28 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm"
                                            autoFocus
                                        />
                                        <div className="flex justify-center gap-3 mt-4">
                                            <button
                                                onClick={() => setRejectModal({ open: false, type: null, requestId: null })}
                                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmReject}
                                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/30 transition-all"
                                            >
                                                Reject Request
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            }

            {/* Confirmation Modal - portaled to body for proper centering */}
            {
                createPortal(
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
                )
            }
        </>
    );
}
