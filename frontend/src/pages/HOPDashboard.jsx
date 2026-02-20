import { useState, useEffect } from 'react';
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
            alert('Saved locally (Demo Mode)');
        }
    };

    const handleDeleteSubject = async (id) => {
        if (!confirm('Are you sure you want to delete this subject?')) return;

        try {
            await api.delete(`/hop/subjects/${id}`);
            await loadData();
        } catch (error) {
            console.error('[DELETE] Backend API call failed:', error);
            console.error('[DELETE] Error details:', error.response?.data);
            alert('Failed to delete subject: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteAllSubjects = async () => {
        if (!confirm('⚠️ WARNING: This will delete ALL subjects, sections, and registrations. This action cannot be undone!\n\nAre you sure you want to continue?')) return;
        if (!confirm('Please confirm again: Delete ALL ' + subjects.length + ' subjects?')) return;

        try {
            await api.delete('/hop/subjects/all');
            await loadData();
        } catch (error) {
            console.error('Delete all subjects error:', error);
            alert('Failed to delete subjects: ' + (error.response?.data?.message || error.message));
        }
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
            alert('Failed to save section: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteSection = async (id) => {
        if (!confirm('Are you sure you want to delete this section?')) return;

        try {
            await api.delete(`/hop/sections/${id}`);
            await loadData();
        } catch (error) {
            console.error('[DELETE SECTION] Backend API call failed:', error);
            console.error('[DELETE SECTION] Error details:', error.response?.data);
            alert('Failed to delete section: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleClearAllSections = async () => {
        if (!confirm('⚠️ WARNING: This will delete ALL sections and their registrations. This action cannot be undone!\n\nAre you sure you want to continue?')) return;
        if (!confirm('Please confirm again: Delete ALL ' + sections.length + ' sections?')) return;

        try {
            await api.delete('/hop/sections/all');
            alert('Successfully deleted all sections');
            await loadData();
        } catch (error) {
            console.error('[CLEAR ALL] Failed:', error);
            alert('Failed to clear sections: ' + (error.response?.data?.message || error.message));
        }
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
            alert('Failed to load students: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleApproveDropRequest = async (requestId) => {
        try {
            await api.post(`/hop/drop-requests/${requestId}/approve`);
            await loadData();
            alert('Drop request approved! Student has been dropped from the section.');
        } catch (error) {
            console.error('Approve drop request failed:', error);
            alert(error.response?.data?.message || 'Failed to approve drop request');
        }
    };

    const handleRejectDropRequest = async (requestId) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            await api.post(`/hop/drop-requests/${requestId}/reject`, {
                rejection_reason: reason
            });
            await loadData();
            alert('Drop request rejected.');
        } catch (error) {
            console.error('Reject drop request failed:', error);
            alert(error.response?.data?.message || 'Failed to reject drop request');
        }
    };

    // Manual Join Request Handlers
    const handleApproveManualRequest = async (requestId) => {
        try {
            await api.put(`/hop/manual-join-requests/${requestId}/approve`, {
                approvalReason: 'Approved by HOP'
            });
            await loadData();
            alert('Manual join request approved! Student has been added to the section.');
        } catch (error) {
            console.error('Approve manual request failed:', error);
            alert(error.response?.data?.message || 'Failed to approve request');
        }
    };

    const handleRejectManualRequest = async (requestId) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            await api.put(`/hop/manual-join-requests/${requestId}/reject`, {
                rejectionReason: reason
            });
            await loadData();
            alert('Manual join request rejected.');
        } catch (error) {
            console.error('Reject manual request failed:', error);
            alert(error.response?.data?.message || 'Failed to reject request');
        }
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
            alert('Failed to load students: ' + (error.response?.data?.message || error.message));
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
            alert('Failed to export: ' + (error.response?.data?.message || error.message));
        }
    };

    // ============================================================================
    // CSV IMPORT HANDLERS
    // ============================================================================

    const handleSubjectsImport = async (data) => {
        setImporting(true);
        try {
            const response = await api.post('/hop/subjects/import', { subjects: data });
            alert(response.data.message);
            setShowSubjectsImport(false);
            loadData(); // Refresh data
        } catch (error) {
            alert('Import failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setImporting(false);
        }
    };

    const handleSectionsImport = async (data) => {
        setImporting(true);
        try {
            const response = await api.post('/hop/sections/import', { sections: data });
            alert(response.data.message);
            setShowSectionsImport(false);
            loadData(); // Refresh data
        } catch (error) {
            alert('Import failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setImporting(false);
        }
    };

    const handleLecturerAssignImport = async (data) => {
        setImporting(true);
        try {
            const response = await api.post('/hop/lecturers/assign-bulk', { assignments: data });
            alert(response.data.message);
            setShowLecturerAssignImport(false);
            loadData(); // Refresh data
        } catch (error) {
            alert('Import failed: ' + (error.response?.data?.message || error.message));
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
        <DashboardLayout
            role="hop"
            title={`Head of Programme Dashboard${user?.programme ? ` — ${user.programme}` : ''}`}
            headerContent={headerContent}
            activeTab={activeTab}
            onTabChange={setActiveTab}
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
            </div>
        </DashboardLayout>
    );
}


// Tab Button
const TabButton = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`px-4 py-3 border-b-2 transition-all ${active
            ? 'border-red-600 text-red-600 font-bold dark:border-red-400 dark:text-red-400'
            : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
    >
        {label}
    </button>
);

// Overview Tab
function OverviewTab({ subjects, sections }) {
    const totalCapacity = sections.reduce((sum, s) => sum + (s.capacity || 0), 0);
    const currentEnrollment = sections.reduce((sum, s) => sum + (s.enrolled_count || 0), 0);
    const fillRate = totalCapacity > 0 ? Math.round((currentEnrollment / totalCapacity) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                {/* Quick Stats Card */}
                <div className="relative group p-6 rounded-[24px] bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-500 hover:border-blue-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />

                    <h3 className="relative z-10 font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Platform Metrics
                    </h3>

                    <div className="relative z-10 grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/5 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-500 to-blue-600 mb-1">{subjects.length}</span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Subjects</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/5 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-red-500 to-rose-600 mb-1">{sections.length}</span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sections</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/5 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-teal-600 mb-1">{currentEnrollment}</span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Enrolled</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/5 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-cyan-500 to-blue-600 mb-1">{fillRate}%</span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Capacity</span>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Card */}
                <div className="relative group p-6 rounded-[24px] bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-500 hover:border-red-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-500/20 dark:bg-red-500/10 rounded-full blur-[40px] pointer-events-none" />

                    <h3 className="relative z-10 font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-red-500" />
                        System Status
                    </h3>

                    <div className="relative z-10 space-y-4">
                        {[
                            { color: 'emerald', text: 'All academic sections successfully configured and mapped.' },
                            { color: 'blue', text: 'Real-time database clustering stabilized at 12ms latency.' },
                            { color: 'red', text: 'Auth tokens rotating securely across all active nodes.' }
                        ].map((stat, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/20 dark:bg-white/5 border border-white/10 dark:border-white/5">
                                <div className={`mt-0.5 w-2 h-2 rounded-full bg-${stat.color}-500 shadow-[0_0_8px_rgba(var(--tw-colors-${stat.color}-500),0.6)] animate-pulse`} />
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-tight">{stat.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* System Info Full-width Card */}
            <div className="relative group p-6 rounded-[24px] bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-500 hover:border-emerald-500/30">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <h3 className="relative z-10 font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-500" />
                    Infrastructure Health
                </h3>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/20 dark:bg-white/5 border border-white/10 text-center md:text-left">
                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Version Stack</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">v1.2.0-rc (Latest)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/20 dark:bg-white/5 border border-white/10 text-center md:text-left">
                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Environment</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-center md:justify-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Production
                        </span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/20 dark:bg-white/5 border border-white/10 text-center md:text-left">
                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Database Shard</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">PostgreSQL 16 (EU-West)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/20 dark:bg-white/5 border border-white/10 text-center md:text-left">
                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Memory Usage</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Stable (42%)</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Subjects Tab
function SubjectsTab({ subjects, subjectProgrammeMap, onRefresh, onAdd, onEdit, onDelete, onDeleteAll, onImport, onImportFile }) {
    const [searchQuery, setSearchQuery] = useState('');

    // Helper: get all programmes a subject belongs to
    const getProgrammes = (code) => {
        const fromMap = subjectProgrammeMap[code] || [];
        // Also include the subject's own programme field as fallback
        const subjectOwn = subjects.filter(s => s.code === code).map(s => s.programme).filter(Boolean);
        const all = [...new Set([...fromMap, ...subjectOwn])];
        return all.length > 0 ? all : ['—'];
    };

    const filteredSubjects = subjects.filter(subject => {
        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!(subject.code || '').toLowerCase().includes(q) &&
                !(subject.name || '').toLowerCase().includes(q)) {
                return false;
            }
        }
        return true;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/70 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                            <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        Manage Subjects
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 ml-14 font-medium">Configure academic curriculum and courses</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {onDeleteAll && subjects.length > 0 && (
                        <button
                            onClick={onDeleteAll}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-gray-200 dark:border-red-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-red-500/20 backdrop-blur-md"
                        >
                            <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Delete All</span>
                        </button>
                    )}
                    {onImportFile && (
                        <button
                            onClick={onImportFile}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-emerald-500/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-gray-200 dark:border-emerald-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-emerald-500/20 backdrop-blur-md"
                        >
                            <FileSpreadsheet size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Import File</span>
                        </button>
                    )}
                    {onImport && (
                        <button
                            onClick={onImport}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-blue-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-blue-500/20 backdrop-blur-md"
                        >
                            <Upload size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Import CSV</span>
                        </button>
                    )}
                    <button
                        onClick={onAdd}
                        className="group relative overflow-hidden flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full md:rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 text-sm transition-all duration-300 border border-white/20"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
                        <Plus size={20} className="relative z-10 transition-transform group-hover:rotate-90" />
                        <span className="hidden md:block ml-2 font-bold uppercase tracking-wider relative z-10">Add Subject</span>
                    </button>
                </div>
            </div>

            {/* Search Bar - Recessed Glass */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-red-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative flex items-center bg-white/50 dark:bg-[#07090e]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-300 focus-within:border-blue-500/50">
                    <div className="pl-5">
                        <Search size={20} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors duration-300" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search subjects by code or name..."
                        className="w-full pl-4 pr-12 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none font-medium"
                    />
                    <AnimatePresence>
                        {searchQuery && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20 hover:text-gray-800 dark:hover:text-white transition-all"
                            >
                                <X size={14} strokeWidth={3} />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />

                    <div className="relative z-10 w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500/10 to-red-500/10 dark:from-white/5 dark:to-white/5 border border-blue-500/20 dark:border-white/10 flex items-center justify-center mb-6 shadow-inner">
                        <BookOpen size={40} className="text-blue-500 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                    </div>
                    <h3 className="relative z-10 text-2xl font-black text-gray-900 dark:text-white mb-3">Curriculum Empty</h3>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-10 font-medium leading-relaxed">
                        The academic registry is currently empty. Get started by adding a new subject manually or importing an entire semester structure via CSV.
                    </p>
                    <button
                        onClick={onAdd}
                        className="relative z-10 inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-1 active:translate-y-0 text-sm tracking-wide transition-all duration-300 border border-white/20 font-bold uppercase"
                    >
                        <Plus size={20} />
                        Add First Subject
                    </button>
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gray-500/10 dark:bg-white/5 rounded-full blur-[50px] pointer-events-none" />
                    <Search size={48} className="relative z-10 mx-auto mb-6 text-gray-300 dark:text-gray-600 drop-shadow-md" />
                    <h3 className="relative z-10 text-xl font-bold text-gray-900 dark:text-white mb-2">No subjects found</h3>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400 font-medium">No results match <span className="text-blue-500 font-bold">"{searchQuery}"</span></p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSubjects.map((subject, index) => (
                        <motion.div
                            key={subject.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative rounded-3xl p-6 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-red-500/0 group-hover:from-blue-500/5 group-hover:to-red-500/5 transition-colors duration-500" />
                            <div className="absolute -inset-[1px] rounded-3xl border border-transparent group-hover:border-blue-500/30 dark:group-hover:border-blue-400/30 transition-colors duration-500 pointer-events-none" />

                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 translate-y-2 group-hover:translate-y-0">
                                <button
                                    onClick={() => onEdit(subject.id)}
                                    className="p-2 rounded-xl bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 backdrop-blur-md shadow-sm transition-all border border-gray-200 dark:border-white/10"
                                    title="Edit Subject"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(subject.id)}
                                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 backdrop-blur-md transition-all border border-red-500/20"
                                    title="Delete Subject"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="relative z-10 mb-6">
                                <span className={`inline-block text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r drop-shadow-sm ${index % 3 === 0 ? 'from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-400' :
                                    index % 3 === 1 ? 'from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400' :
                                        'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400'
                                    }`}>
                                    {subject.code}
                                </span>
                                <h4 className="text-gray-900 dark:text-white/90 font-bold leading-tight mt-2 text-lg group-hover:text-blue-600 dark:group-hover:text-white transition-colors duration-300">
                                    {subject.name}
                                </h4>
                            </div>

                            <div className="relative z-10 flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-200/50 dark:border-white/5">
                                <span className="px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 shadow-sm">
                                    <Clock size={14} className="text-blue-500 dark:text-blue-400" />
                                    {subject.credit_hours} Credits
                                </span>
                                <span className="px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 shadow-sm">
                                    <Calendar size={14} className="text-blue-500 dark:text-blue-400" />
                                    Sem {subject.semester || '?'}
                                </span>
                                <span className="px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 shadow-sm">
                                    <Users size={14} className="text-red-500 dark:text-red-400" />
                                    {getProgrammes(subject.code).join(', ')}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

// Sections Tab - Grouped by Subject with Expandable List
function SectionsTab({ sections, subjects, subjectProgrammeMap, onRefresh, onAdd, onEdit, onDelete, onViewStudents, onImport, onAssignLecturers, onClearAll }) {
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Group sections by subject
    const groupedSections = sections.reduce((acc, section) => {
        const key = section.subject_code || section.code || 'unknown';
        if (!acc[key]) {
            acc[key] = {
                code: section.subject_code || section.code || 'Unknown',
                name: section.subject_name || section.name || 'Unnamed Subject',
                sections: []
            };
        }
        acc[key].sections.push(section);
        return acc;
    }, {});

    const subjectGroups = Object.values(groupedSections);

    const filteredGroups = subjectGroups.filter(group => {
        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!(group.code || '').toLowerCase().includes(q) &&
                !(group.name || '').toLowerCase().includes(q)) {
                return false;
            }
        }
        return true;
    });

    return (
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
                            <Layers className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        Manage Sections
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 ml-14 font-medium">Organize and assemble course sections and capacities.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {onImport && (
                        <button
                            onClick={onImport}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-blue-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-blue-500/20 backdrop-blur-md"
                        >
                            <Upload size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Import CSV</span>
                        </button>
                    )}
                    {onAssignLecturers && (
                        <button
                            onClick={onAssignLecturers}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-teal-500/10 hover:bg-teal-50 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-gray-200 dark:border-teal-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-teal-500/20 backdrop-blur-md"
                        >
                            <Users size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Assign Lecturers</span>
                        </button>
                    )}
                    {sections.length > 0 && onClearAll && (
                        <button
                            onClick={onClearAll}
                            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 bg-white/40 dark:bg-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-gray-200 dark:border-red-500/20 rounded-full md:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-red-500/20 backdrop-blur-md"
                        >
                            <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                            <span className="hidden md:block ml-2 font-bold tracking-wide">Clear All</span>
                        </button>
                    )}
                    <button
                        onClick={onAdd}
                        className="group relative overflow-hidden flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full md:rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 text-sm transition-all duration-300 border border-white/20"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
                        <Plus size={20} className="relative z-10 transition-transform group-hover:rotate-90" />
                        <span className="hidden md:block ml-2 font-bold uppercase tracking-wider relative z-10">Add Section</span>
                    </button>
                </div>
            </div>

            {/* Search Bar - Recessed Glass */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-red-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative flex items-center bg-white/50 dark:bg-[#07090e]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-300 focus-within:border-blue-500/50">
                    <div className="pl-5">
                        <Search size={20} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors duration-300" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search sections by subject code or name..."
                        className="w-full pl-4 pr-12 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none font-medium"
                    />
                    <AnimatePresence>
                        {searchQuery && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20 hover:text-gray-800 dark:hover:text-white transition-all"
                            >
                                <X size={14} strokeWidth={3} />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content */}
            {subjectGroups.length === 0 ? (
                <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />

                    <div className="relative z-10 w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500/10 to-red-500/10 dark:from-white/5 dark:to-white/5 border border-blue-500/20 dark:border-white/10 flex items-center justify-center mb-6 shadow-inner">
                        <Layers size={40} className="text-blue-500 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                    </div>
                    <h3 className="relative z-10 text-2xl font-black text-gray-900 dark:text-white mb-3">No Sections Yet</h3>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-10 font-medium leading-relaxed">
                        You have not created any sections yet. Start by generating new sections manually or importing a batch from CSV.
                    </p>
                    <button
                        onClick={onAdd}
                        className="relative z-10 inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-1 active:translate-y-0 text-sm tracking-wide transition-all duration-300 border border-white/20 font-bold uppercase"
                    >
                        <Plus size={20} />
                        Create First Section
                    </button>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="relative rounded-[32px] overflow-hidden p-16 text-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-[#11131e]/60 backdrop-blur-2xl">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gray-500/10 dark:bg-white/5 rounded-full blur-[50px] pointer-events-none" />
                    <Search size={48} className="relative z-10 mx-auto mb-6 text-gray-300 dark:text-gray-600 drop-shadow-md" />
                    <h3 className="relative z-10 text-xl font-bold text-gray-900 dark:text-white mb-2">No results found</h3>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400 font-medium">No sections match <span className="text-blue-500 font-bold">"{searchQuery}"</span></p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredGroups.map((subject, idx) => {
                        const isExpanded = expandedSubject === subject.code;
                        const totalStudents = subject.sections.reduce((sum, s) => sum + (s.enrolled_count || 0), 0);
                        const totalCapacity = subject.sections.reduce((sum, s) => sum + (s.capacity || 0), 0);
                        const utilization = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

                        return (
                            <motion.div
                                key={subject.code}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`relative rounded-3xl overflow-hidden transition-all duration-500 backdrop-blur-2xl ${isExpanded
                                    ? 'bg-white/60 dark:bg-[#11131e]/80 border border-blue-500/30 shadow-[0_8px_40px_rgba(37,99,235,0.1)] dark:shadow-[0_8px_40px_rgba(37,99,235,0.2)]'
                                    : 'bg-white/40 dark:bg-[#11131e]/50 border border-white/40 dark:border-white/10 hover:border-blue-500/30 dark:hover:border-blue-400/30 hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]'}`}
                            >
                                {/* Subject Header - Clickable */}
                                <button
                                    onClick={() => setExpandedSubject(isExpanded ? null : subject.code)}
                                    className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 text-left group relative z-10"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-red-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    <div className="flex items-center gap-5 md:gap-6 mb-4 md:mb-0 relative z-10">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-all duration-500 ${isExpanded ? 'bg-gradient-to-br from-blue-600 to-red-600 text-white scale-110 shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/80 dark:bg-black/20 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 group-hover:bg-blue-50 dark:group-hover:bg-white/5'}`}>
                                            {subject.code?.slice(0, 3) || '???'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/70 group-hover:from-blue-600 group-hover:to-red-600 dark:group-hover:from-blue-400 dark:group-hover:to-red-400 transition-all duration-300">
                                                {subject.code}
                                            </h3>
                                            <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mt-1">
                                                {subject.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-200 dark:border-white/5 md:border-transparent relative z-10">
                                        {/* Stats Pills */}
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="px-3 md:px-4 py-2 rounded-xl bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/5 flex items-center gap-2 shadow-sm backdrop-blur-md">
                                                <Users size={16} className="text-blue-500 dark:text-blue-400" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                    {totalStudents}<span className="text-gray-400 dark:text-gray-600 font-medium">/</span>{totalCapacity}
                                                </span>
                                            </div>
                                            <div className="px-3 md:px-4 py-2 rounded-xl bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/5 flex items-center gap-2 shadow-sm backdrop-blur-md">
                                                <LayoutDashboard size={16} className="text-blue-500 dark:text-blue-400" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                    {subject.sections.length} <span className="text-gray-500 dark:text-gray-500 text-xs font-medium uppercase tracking-wider ml-1 hidden sm:inline-block">Sections</span>
                                                </span>
                                            </div>
                                        </div>

                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                                            className={`p-2.5 rounded-xl transition-colors duration-300 ${isExpanded ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-blue-50 dark:group-hover:bg-white/10 group-hover:text-blue-500 dark:group-hover:text-white border border-gray-200 dark:border-white/5'}`}
                                        >
                                            <ChevronDown size={20} strokeWidth={3} />
                                        </motion.div>
                                    </div>
                                </button>

                                {/* Sections List - Expandable */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                            className="overflow-hidden bg-gray-50/50 dark:bg-black/20 border-t border-gray-200/50 dark:border-white/5"
                                        >
                                            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {subject.sections.map((section, sIdx) => {
                                                    const percentFull = section.capacity > 0 ? (section.enrolled_count / section.capacity) * 100 : 0;
                                                    const isFull = percentFull >= 100;

                                                    return (
                                                        <motion.div
                                                            key={section.id}
                                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            transition={{ delay: sIdx * 0.05 + 0.1, duration: 0.4 }}
                                                            className="group/section relative rounded-2xl p-5 bg-white/80 dark:bg-[#11131e]/80 backdrop-blur-md border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-red-500/0 group-hover/section:from-blue-500/5 group-hover/section:to-red-500/5 transition-colors duration-500" />
                                                            <div className="absolute -inset-[1px] rounded-2xl border border-transparent group-hover/section:border-blue-500/30 dark:group-hover/section:border-blue-400/30 transition-colors duration-500 pointer-events-none" />

                                                            {/* Header */}
                                                            <div className="flex justify-between items-start mb-5 relative z-10">
                                                                <div>
                                                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] block mb-1.5">Section</span>
                                                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2 group-hover/section:text-blue-600 dark:group-hover/section:text-blue-400 transition-colors">
                                                                        {section.section_number}
                                                                        {isFull && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />}
                                                                    </h4>
                                                                </div>

                                                                {/* Enrollment Badge */}
                                                                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm ${isFull
                                                                    ? 'bg-red-50/80 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                                                    : 'bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                                    }`}>
                                                                    <Users size={12} strokeWidth={3} />
                                                                    <span>{section.enrolled_count || 0}/{section.capacity}</span>
                                                                </div>
                                                            </div>

                                                            {/* Schedules */}
                                                            <div className="space-y-2.5 mb-5 relative z-10 bg-gray-50/50 dark:bg-black/20 p-3.5 rounded-xl border border-gray-100 dark:border-white/5">
                                                                {section.schedules && section.schedules.length > 0 ? (
                                                                    section.schedules.map((schedule, schIdx) => (
                                                                        <div key={schIdx} className="flex items-center gap-2.5 text-sm">
                                                                            <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                                                                <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
                                                                            </div>
                                                                            <span className="font-bold text-gray-700 dark:text-gray-200 capitalize w-10">{schedule.day.slice(0, 3)}</span>
                                                                            <span className="font-medium text-gray-500 dark:text-gray-400">{schedule.start_time} - {schedule.end_time}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="flex items-center gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                                                        <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                                                                            <Calendar size={12} />
                                                                        </div>
                                                                        <span className="italic font-medium">Schedule TBA</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2.5 text-sm pt-1.5 border-t border-gray-200/50 dark:border-white/5 mt-2.5">
                                                                    <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                                                                        <Users size={12} className="text-red-600 dark:text-red-400" />
                                                                    </div>
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">
                                                                        {section.lecturer_name || <span className="italic text-gray-400 dark:text-gray-500">Unassigned Lecturer</span>}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Progress Bar */}
                                                            <div className="relative z-10 w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-6 shadow-inner">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isFull ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`}
                                                                    style={{ width: `${Math.min(percentFull, 100)}%` }}
                                                                >
                                                                    <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" />
                                                                </div>
                                                            </div>

                                                            {/* Actions Overlay */}
                                                            <div className="relative z-10 flex items-center justify-end gap-2 pt-4 border-t border-gray-200/50 dark:border-white/5 bg-gradient-to-t from-white/50 to-transparent dark:from-black/20 dark:to-transparent -mx-5 -mb-5 px-5 pb-5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onViewStudents(section.id); }}
                                                                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/80 dark:bg-black/40 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-gray-200 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/20 transition-all shadow-sm group/btn"
                                                                    title="View Students"
                                                                >
                                                                    <Users size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onEdit(section.id); }}
                                                                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/80 dark:bg-black/40 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm group/btn"
                                                                    title="Edit Section"
                                                                >
                                                                    <Edit size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
                                                                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/80 dark:bg-black/40 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-gray-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/20 transition-all shadow-sm group/btn"
                                                                    title="Delete Section"
                                                                >
                                                                    <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}

// Helper for consistent colors
const getSubjectColor = (code) => {
    const colors = [
        'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-100',
        'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-100',
        'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-100',
        'bg-green-100 border-green-300 text-green-900 dark:bg-green-900/40 dark:border-green-700 dark:text-green-100',
        'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-100',
        'bg-teal-100 border-teal-300 text-teal-900 dark:bg-teal-900/40 dark:border-teal-700 dark:text-teal-100',
        'bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-100',
        'bg-sky-100 border-sky-300 text-sky-900 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-100',
        'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100',
        'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100',
        'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-100',
        'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-100',
        'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:border-fuchsia-700 dark:text-fuchsia-100',
        'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-100',
        'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-100',
    ];

    if (!code) return colors[0];

    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

// Timetable Tab (Grid View)
function TimetableTab({ sections, subjects }) {
    const [selectedSemester, setSelectedSemester] = useState('all');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Time range: 8:00 AM to 10:00 PM
    const startHour = 8;
    const endHour = 22; // 10 PM
    const timeSlots = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    // Get unique semesters from subjects
    const availableSemesters = [...new Set(subjects?.map(s => s.semester).filter(Boolean))].sort((a, b) => a - b);

    // Filter sections by selected semester
    const filteredSections = selectedSemester === 'all'
        ? sections
        : sections.filter(s => s.semester === parseInt(selectedSemester));

    const formatTime = (hour) => {
        const h = hour % 12 || 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        return `${h} ${ampm}`;
    };

    // Helper to process sections for a day and assign vertical positions
    const getProcessedDaySections = (day) => {
        const daySections = filteredSections
            .filter(s => s.day.toLowerCase() === day.toLowerCase())
            .map(s => {
                const startH = parseInt(s.start_time.split(':')[0]);
                const startM = parseInt(s.start_time.split(':')[1]);
                const endH = parseInt(s.end_time.split(':')[0]);
                const endM = parseInt(s.end_time.split(':')[1]);

                // Convert to minutes from 8:00 AM
                const startMinutes = (startH - startHour) * 60 + startM;
                const durationMinutes = ((endH - startH) * 60) + (endM - startM);

                return {
                    ...s,
                    startMinutes,
                    endMinutes: startMinutes + durationMinutes,
                    durationMinutes
                };
            })
            .sort((a, b) => a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes);

        // Assign vertical levels
        const levels = []; // Array of end times for each level
        const positionedSections = daySections.map(section => {
            let level = 0;
            // Find the first level where this section fits
            while (true) {
                if (!levels[level] || levels[level] <= section.startMinutes) {
                    levels[level] = section.endMinutes;
                    break;
                }
                level++;
            }
            return { ...section, level };
        });

        // Calculate total height needed
        const totalLevels = levels.length > 0 ? levels.length : 1;
        const trackHeight = 85;
        const rowHeight = Math.max(trackHeight, totalLevels * trackHeight);

        return { sections: positionedSections, rowHeight, trackHeight };
    };

    return (
        <div className="pb-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
            <div className="min-w-[800px]">
                {/* Header with Semester Selector */}
                <div className="flex justify-between items-center p-6 pb-4 sticky left-0 z-30 bg-white dark:bg-gray-800">
                    <div>
                        <h3 className="font-bold text-xl text-gray-800 dark:text-white">Global Timetable</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {filteredSections.length} sections {selectedSemester !== 'all' ? `in Semester ${selectedSemester}` : 'across all semesters'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Semester:</label>
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <option value="all">All Semesters</option>
                            {availableSemesters.map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full select-none">
                    {/* Header Row */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                        <div className="w-24 flex-shrink-0 p-2 border-r border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-0 z-20 bg-gray-100 dark:bg-gray-700">
                            Day
                        </div>
                        <div className="flex-1 flex relative">
                            {timeSlots.map(hour => (
                                <div key={hour} className="flex-1 p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-100/50 dark:border-gray-700/50 last:border-r-0">
                                    {formatTime(hour)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Day Rows */}
                    {days.map((day, dayIndex) => {
                        const { sections: daySections, rowHeight, trackHeight } = getProcessedDaySections(day);

                        return (
                            <div
                                key={day}
                                className="flex border-b border-gray-200 dark:border-gray-700 relative group"
                                style={{ height: `${rowHeight}px` }}
                            >
                                {/* Day Label */}
                                <div className={`w-24 flex-shrink-0 flex items-center justify-center p-4 font-bold text-lg text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700 uppercase tracking-widest sticky left-0 z-10 ${dayIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                    {day.substring(0, 3)}
                                </div>

                                {/* Timeline Area */}
                                <div className="flex-1 relative">
                                    {/* Grid Lines (Background) */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {timeSlots.map((_, i) => (
                                            <div key={i} className="flex-1 border-r border-gray-100 dark:border-gray-800/50 last:border-r-0" />
                                        ))}
                                    </div>

                                    {/* Sections Blocks */}
                                    {daySections.map(section => {
                                        const totalMinutes = (endHour - startHour + 1) * 60;
                                        const leftPercent = (section.startMinutes / totalMinutes) * 100;
                                        const widthPercent = (section.durationMinutes / totalMinutes) * 100;
                                        const topPos = section.level * trackHeight;
                                        const colorClass = getSubjectColor(section.subject_code);

                                        return (
                                            <motion.div
                                                key={section.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                whileHover={{ scale: 1.05, zIndex: 50 }}
                                                className="absolute p-0.5 transition-all duration-200 group/card"
                                                title={`${section.subject_code} - ${section.subject_name} (${section.room}) | Sem ${section.semester}`}
                                                style={{
                                                    left: `${leftPercent}%`,
                                                    width: `${widthPercent}%`,
                                                    top: `${topPos}px`,
                                                    height: `${trackHeight}px`
                                                }}
                                            >
                                                <div className={`
                                                    h-full w-full rounded shadow-sm border-l-[3px] ${colorClass} 
                                                    text-xs flex flex-col justify-between p-1.5 overflow-hidden
                                                    relative cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-opacity-50 ring-blue-500
                                                `}>
                                                    <div className="flex justify-between items-start gap-1">
                                                        <div className="font-bold text-[11px] leading-tight mb-1 break-words whitespace-normal" title={section.subject_name}>

                                                            {section.subject_code}
                                                        </div>
                                                        <span className="text-[9px] uppercase font-bold px-1 rounded bg-black/10 dark:bg-white/20 whitespace-nowrap">
                                                            {section.section_number}
                                                        </span>
                                                    </div>

                                                    <div className="mt-auto">
                                                        <div className="flex items-center gap-1 opacity-90 text-[10px] truncate">
                                                            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                                            <span className="truncate">{section.room || 'TBA'}</span>
                                                        </div>
                                                        {selectedSemester === 'all' && (
                                                            <div className="flex items-center gap-1 opacity-80 text-[10px] truncate">
                                                                <span className="truncate font-medium">Sem {section.semester}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty State */}
                    {filteredSections.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No sections found for Semester {selectedSemester}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sessions Management Component for HOP
function SessionsManagement({ onRefresh }) {
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
            alert(res.data.message);
            setShowCreateModal(false);
            setFormData({ code: '', name: '', start_date: '', end_date: '', status: 'upcoming', clone_from_session_id: '' });
            loadSessions();
            if (onRefresh) onRefresh();
        } catch (error) {
            alert('Failed to create session: ' + (error.response?.data?.message || error.message));
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
            alert('Failed to update session: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleActivate = async (sessionId) => {
        if (!confirm('This will archive all other sessions and activate this one. Continue?')) return;
        try {
            await api.put(`/sessions/${sessionId}/activate`);
            loadSessions();
            if (onRefresh) onRefresh();
        } catch (error) {
            alert('Failed to activate session: ' + error.response?.data?.message || error.message);
        }
    };

    const handleArchive = async (sessionId) => {
        if (!confirm('Archive this session?')) return;
        try {
            await api.put(`/sessions/${sessionId}/archive`);
            loadSessions();
            if (onRefresh) onRefresh();
        } catch (error) {
            alert('Failed to archive session: ' + error.response?.data?.message || error.message);
        }
    };

    const handleDelete = async (sessionId) => {
        if (!confirm('Delete this session? This cannot be undone.')) return;
        try {
            await api.delete(`/sessions/${sessionId}`);
            loadSessions();
            if (onRefresh) onRefresh();
        } catch (error) {
            alert('Failed to delete session: ' + error.response?.data?.message || error.message);
        }
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
    );
}

