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
    Search
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
            console.log('✅ Loaded data from backend:', {
                subjects: subjectsRes.data.data?.length || 0,
                sections: sectionsRes.data.data?.length || 0
            });
        } catch (error) {
            console.log('Backend not ready, using mock data');
            setSubjects([
                { id: 1, code: 'CSC101', name: 'Introduction to Computer Science', credit_hours: 3, semester: 1, programme: 'BCS' },
                { id: 2, code: 'MAT202', name: 'Calculus II', credit_hours: 4, semester: 2, programme: 'BCS' },
                { id: 3, code: 'ENG101', name: 'English for Communication', credit_hours: 2, semester: 1, programme: 'ALL' }
            ]);
            setSections([
                { id: 1, subject_code: 'CSC101', subject_name: 'Intro to CS', section_number: 1, day: 'monday', start_time: '08:00', end_time: '10:00', room: 'BK1', enrolled_count: 25, capacity: 30 },
                { id: 2, subject_code: 'CSC101', subject_name: 'Intro to CS', section_number: 2, day: 'tuesday', start_time: '10:00', end_time: '12:00', room: 'BK2', enrolled_count: 30, capacity: 30 },
                { id: 3, subject_code: 'MAT202', subject_name: 'Calculus II', section_number: 1, day: 'wednesday', start_time: '14:00', end_time: '16:00', room: 'LH1', enrolled_count: 15, capacity: 30 }
            ]);
            setStatistics({
                total_subjects: 3,
                total_sections: 3,
                total_students: 156,
                avg_utilization: 78
            });
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

        console.log('[DELETE] Attempting to delete subject ID:', id);
        try {
            console.log('[DELETE] Making DELETE request to /hop/subjects/' + id);
            const response = await api.delete(`/hop/subjects/${id}`);
            console.log('[DELETE] Response:', response);
            await loadData(); // Refresh from server
            console.log('[DELETE] Data reloaded successfully');
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
                console.log('[SECTION] Updating section', editingSection.id, 'with data:', updateData);
                await api.put(`/hop/sections/${editingSection.id}`, updateData);
                console.log('[SECTION] Update successful');
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

                console.log('[SECTION] Creating section with data:', createData);
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

        console.log('[DELETE SECTION] Attempting to delete section ID:', id);
        try {
            console.log('[DELETE SECTION] Making DELETE request to /hop/sections/' + id);
            const response = await api.delete(`/hop/sections/${id}`);
            console.log('[DELETE SECTION] Response:', response);
            await loadData();
            console.log('[DELETE SECTION] Data reloaded successfully');
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
            const response = await api.delete('/hop/sections/all');
            console.log('[CLEAR ALL] Response:', response.data);
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
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-purple-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout
            role="hop"
            title={`Head of Programme Dashboard${user?.programme ? ` — ${user.programme}` : ''}`}
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatsCard
                            icon={<BookOpen className="w-6 h-6" />}
                            title="Total Subjects"
                            value={statistics.totalSubjects || subjects.length}
                            color="purple"
                        />
                        <StatsCard
                            icon={<Calendar className="w-6 h-6" />}
                            title="Active Sections"
                            value={statistics.totalSections || sections.length}
                            color="pink"
                        />
                        <StatsCard
                            icon={<Users className="w-6 h-6" />}
                            title="Total Students"
                            value={statistics.totalStudents || 0}
                            color="indigo"
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
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Pending Drop Requests</h3>
                                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                    {dropRequests.length} Pending
                                </span>
                            </div >


                            {
                                dropRequests.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <p>No pending drop requests</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {dropRequests.map(request => (
                                            <div key={request.id} className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 dark:from-orange-900/30 dark:to-red-900/30 dark:border-orange-800">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h4 className="font-bold text-gray-800 dark:text-white">
                                                                {request.student_name} ({request.student_number})
                                                            </h4>
                                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                                Pending
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 mb-2 dark:text-gray-300">
                                                            <strong>Section:</strong> {request.subject_code} - {request.subject_name} (Section {request.section_number})
                                                        </p>
                                                        <div className="bg-white rounded p-3 mb-3 dark:bg-gray-800 border border-transparent dark:border-gray-700">
                                                            <p className="text-sm text-gray-600 dark:text-gray-200">
                                                                <strong>Reason:</strong> {request.reason}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Requested: {new Date(request.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        <button
                                                            onClick={() => handleApproveDropRequest(request.id)}
                                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectDropRequest(request.id)}
                                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </div>
                    )}

                    {activeTab === 'manual-requests' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Pending Manual Join Requests</h3>
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium dark:bg-purple-900/30 dark:text-purple-300">
                                    {manualRequests.length} Pending
                                </span>
                            </div>

                            {manualRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No pending manual join requests</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {manualRequests.map(request => (
                                        <motion.div
                                            key={request.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 dark:from-purple-900/30 dark:to-pink-900/30 dark:border-purple-800"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="font-bold text-gray-800 dark:text-white">
                                                            {request.student_name} ({request.student_id})
                                                        </h4>
                                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium dark:bg-purple-900/50 dark:text-purple-300">
                                                            Pending Approval
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 mb-2 dark:text-gray-300">
                                                        <strong>Wants to join:</strong> {request.subject_code} - {request.subject_name} (Section {request.section_number})
                                                    </p>
                                                    <p className="text-sm text-gray-600 mb-2 dark:text-gray-400">
                                                        <strong>Capacity:</strong> {request.enrolled_count}/{request.capacity} students
                                                        {request.enrolled_count >= request.capacity && (
                                                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs dark:bg-red-900/50 dark:text-red-300">
                                                                Section Full
                                                            </span>
                                                        )}
                                                    </p>
                                                    <div className="bg-white rounded p-3 mb-3 dark:bg-gray-800 border border-transparent dark:border-gray-700">
                                                        <p className="text-sm text-gray-600 dark:text-gray-200">
                                                            <strong>Reason:</strong> {request.reason}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Requested: {new Date(request.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 ml-4">
                                                    <button
                                                        onClick={() => handleApproveManualRequest(request.id)}
                                                        className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectManualRequest(request.id)}
                                                        className="flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
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
                                className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-1.5">Subject Name</label>
                            <input
                                name="name"
                                defaultValue={editingSubject?.name}
                                required
                                className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
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
                                    className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-1.5">Semester</label>
                                <select
                                    name="semester"
                                    defaultValue={editingSubject?.semester || 1}
                                    disabled={!!editingSubject}
                                    className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3 disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-500 dark:disabled:text-white/30"
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
                                    className="mt-1 block w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3 disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-500 dark:disabled:text-white/30"
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
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
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
                                className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Day</label>
                                <select
                                    name="day"
                                    defaultValue={editingSection?.day || 'monday'}
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
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
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">End Time</label>
                                <input
                                    name="end_time"
                                    type="time"
                                    defaultValue={editingSection?.end_time || '10:00'}
                                    required
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
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
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Building</label>
                                <input
                                    name="building"
                                    defaultValue={editingSection?.building || ''}
                                    placeholder="Optional"
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Capacity</label>
                                <input
                                    name="capacity"
                                    type="number"
                                    defaultValue={editingSection?.capacity || 30}
                                    required
                                    className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-1.5">Lecturer (optional)</label>
                            <select
                                name="lecturer_id"
                                defaultValue={editingSection?.lecturer_id || ''}
                                className="mt-1 block w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all sm:text-sm p-3"
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
                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
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
            ? 'border-purple-600 text-purple-600 font-bold dark:border-purple-400 dark:text-purple-400'
            : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
    >
        {label}
    </button>
);

// Overview Tab
function OverviewTab({ subjects, sections }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 dark:bg-purple-900/20 dark:border-purple-800">
                    <h3 className="font-bold text-lg text-gray-800 mb-4 dark:text-white">Quick Stats</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Total Subjects:</span>
                            <span className="font-bold dark:text-white">{subjects.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Total Sections:</span>
                            <span className="font-bold dark:text-white">{sections.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Total Capacity:</span>
                            <span className="font-bold dark:text-white">
                                {sections.reduce((sum, s) => sum + (s.capacity || 0), 0)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Current Enrollment:</span>
                            <span className="font-bold dark:text-white">
                                {sections.reduce((sum, s) => sum + (s.enrolled_count || 0), 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 dark:bg-pink-900/20 dark:border-pink-800">
                    <h3 className="font-bold text-lg text-gray-800 mb-4 dark:text-white">Recent Activity</h3>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <p>✓ System running smoothly</p>
                        <p>✓ All sections configured</p>
                        <p>✓ Database connected</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-gray-800 dark:border-gray-700">
                <h3 className="font-bold text-lg text-gray-800 mb-4 dark:text-white">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600 dark:text-gray-300">Version: 1.0.0</p>
                        <p className="text-gray-600 dark:text-gray-300">Environment: Development</p>
                    </div>
                    <div>
                        <p className="text-gray-600 dark:text-gray-300">Database: PostgreSQL</p>
                        <p className="text-gray-600 dark:text-gray-300">Status: <span className="text-green-600 font-medium">Healthy</span></p>
                    </div>
                </div>
            </div>
        </div>
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <BookOpen className="text-indigo-500 dark:text-indigo-400" size={24} />
                        Manage Subjects
                    </h3>
                    <p className="text-gray-500 dark:text-white/40 text-sm mt-1">View and manage all academic subjects</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {onDeleteAll && subjects.length > 0 && (
                        <button
                            onClick={onDeleteAll}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                            <Trash2 size={16} />
                            <span>Delete All</span>
                        </button>
                    )}
                    {onImportFile && (
                        <button
                            onClick={onImportFile}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                            <FileSpreadsheet size={16} />
                            <span>Import File</span>
                        </button>
                    )}
                    {onImport && (
                        <button
                            onClick={onImport}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                            <Upload size={16} />
                            <span>Import CSV</span>
                        </button>
                    )}
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={18} />
                        <span className="font-semibold">Add Subject</span>
                    </button>
                </div>
            </div>



            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subjects by code or name..."
                    className="w-full pl-11 pr-10 py-3 bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {subjects.length === 0 ? (
                <div className="glass-card p-12 rounded-3xl border border-gray-200 dark:border-white/10 text-center flex flex-col items-center justify-center bg-white/60 dark:bg-black/20">
                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6 relative group">
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-colors" />
                        <BookOpen size={32} className="text-gray-400 dark:text-white/40 relative z-10 group-hover:text-gray-600 dark:group-hover:text-white/60 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Subjects Found</h3>
                    <p className="text-gray-500 dark:text-white/40 max-w-sm mb-8">
                        Get started by adding a new subject manually or importing them via CSV/Excel.
                    </p>
                    <button
                        onClick={onAdd}
                        className="px-6 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-all border border-gray-200 dark:border-white/10 flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add First Subject
                    </button>
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="glass-card p-12 rounded-3xl border border-gray-200 dark:border-white/10 text-center bg-white/60 dark:bg-black/20">
                    <Search size={40} className="mx-auto mb-4 text-gray-300 dark:text-white/20" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No results found</h3>
                    <p className="text-gray-500 dark:text-white/40 text-sm">No subjects match "{searchQuery}"</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSubjects.map((subject, index) => (
                        <motion.div
                            key={subject.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative glass-card p-5 rounded-2xl border border-gray-200 dark:border-white/5 bg-white/80 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 dark:hover:border-white/10 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10"
                        >
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onEdit(subject.id)}
                                    className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    title="Edit Subject"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={() => onDelete(subject.id)}
                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                                    title="Delete Subject"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="mb-4">
                                <span className={`inline-block text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${index % 3 === 0 ? 'from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400' :
                                    index % 3 === 1 ? 'from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400' :
                                        'from-pink-600 to-rose-600 dark:from-pink-400 dark:to-rose-400'
                                    }`}>
                                    {subject.code}
                                </span>
                                <h4 className="text-gray-900 dark:text-white/90 font-medium leading-tight mt-1 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                                    {subject.name}
                                </h4>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-auto">
                                <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-xs text-gray-500 dark:text-white/50 flex items-center gap-1.5">
                                    <Clock size={12} className="text-indigo-500 dark:text-indigo-400" />
                                    {subject.credit_hours} Credits
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-xs text-gray-500 dark:text-white/50 flex items-center gap-1.5">
                                    <Calendar size={12} className="text-purple-500 dark:text-purple-400" />
                                    Sem {subject.semester || '?'}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-xs text-gray-500 dark:text-white/50 flex items-center gap-1.5">
                                    <Users size={12} className="text-pink-500 dark:text-pink-400" />
                                    {getProgrammes(subject.code).join(', ')}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
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
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Manage Sections</h3>
                    <p className="text-gray-500 dark:text-white/50 text-sm mt-1">Organize and manage course sections by subject.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {onImport && (
                        <Button
                            variant="secondary"
                            onClick={onImport}
                            icon={<Upload size={16} />}
                        >
                            Import CSV
                        </Button>
                    )}
                    {onAssignLecturers && (
                        <Button
                            variant="primary"
                            onClick={onAssignLecturers}
                            className="bg-teal-600 hover:bg-teal-700 from-teal-500 to-teal-700 border-teal-500/50"
                            icon={<Users size={16} />}
                        >
                            Assign Lecturers
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        onClick={onAdd}
                        icon={<Plus size={16} />}
                    >
                        Add Section
                    </Button>
                    {sections.length > 0 && onClearAll && (
                        <Button
                            variant="danger"
                            onClick={onClearAll}
                            icon={<Trash2 size={16} />}
                        >
                            Clear All
                        </Button>
                    )}
                </div>
            </div>



            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sections by subject code or name..."
                    className="w-full pl-11 pr-10 py-3 bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Content */}
            {subjectGroups.length === 0 ? (
                <div className="glass-card bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-16 text-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/10 animate-pulse">
                        <BookOpen className="w-10 h-10 text-gray-400 dark:text-white/20" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No sections created yet</h3>
                    <p className="text-gray-500 dark:text-white/40 mb-8 max-w-md mx-auto">
                        Get started by adding a new section manually or importing them via CSV.
                    </p>
                    <Button onClick={onAdd} icon={<Plus size={18} />}>
                        Create First Section
                    </Button>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="glass-card bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-12 text-center">
                    <Search size={40} className="mx-auto mb-4 text-gray-300 dark:text-white/20" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No results found</h3>
                    <p className="text-gray-500 dark:text-white/40 text-sm">No sections match "{searchQuery}"</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredGroups.map(subject => {
                        const isExpanded = expandedSubject === subject.code;
                        const totalStudents = subject.sections.reduce((sum, s) => sum + (s.enrolled_count || 0), 0);
                        const totalCapacity = subject.sections.reduce((sum, s) => sum + (s.capacity || 0), 0);
                        const utilization = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

                        return (
                            <motion.div
                                key={subject.code}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-white/90 dark:bg-black/40 border-indigo-500/30 shadow-lg shadow-indigo-500/10' : 'bg-white/60 dark:bg-black/20 border-gray-200 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/30'}`}
                            >
                                {/* Subject Header - Clickable */}
                                <button
                                    onClick={() => setExpandedSubject(isExpanded ? null : subject.code)}
                                    className="w-full flex items-center justify-between p-5 text-left group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg transition-all duration-300 ${isExpanded ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-105' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white group-hover:bg-gray-200 dark:group-hover:bg-white/15'}`}>
                                            {subject.code?.slice(0, 3) || '???'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">
                                                {subject.code}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-white/50">
                                                {subject.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {/* Stats Pills */}
                                        <div className="hidden md:flex items-center gap-3">
                                            <div className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center gap-2">
                                                <Users size={14} className="text-indigo-500 dark:text-indigo-400" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-white/80">
                                                    {totalStudents}<span className="text-gray-300 dark:text-white/30">/</span>{totalCapacity}
                                                </span>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center gap-2">
                                                <LayoutDashboard size={14} className="text-purple-500 dark:text-purple-400" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-white/80">
                                                    {subject.sections.length} <span className="text-gray-400 dark:text-white/40 text-xs uppercase ml-1">Sections</span>
                                                </span>
                                            </div>
                                        </div>

                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`p-2 rounded-full ${isExpanded ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/30 group-hover:text-gray-900 dark:group-hover:text-white group-hover:bg-gray-100 dark:group-hover:bg-white/5'}`}
                                        >
                                            <ChevronDown className="w-5 h-5" />
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
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="border-t border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-black/20"
                                        >
                                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {subject.sections.map((section, idx) => {
                                                    const percentFull = section.capacity > 0 ? (section.enrolled_count / section.capacity) * 100 : 0;
                                                    const isFull = percentFull >= 100;

                                                    return (
                                                        <motion.div
                                                            key={section.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="group relative bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 hover:border-indigo-500/30 dark:hover:border-white/10 rounded-xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-black/20"
                                                        >
                                                            {/* Header */}
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <span className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-wider block mb-1">Section</span>
                                                                    <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                                        {section.section_number}
                                                                        {isFull && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                                    </h4>
                                                                </div>

                                                                {/* Enrollment Badge */}
                                                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${isFull
                                                                    ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'
                                                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                                    }`}>
                                                                    {section.enrolled_count || 0}/{section.capacity}
                                                                </div>
                                                            </div>

                                                            {/* Schedules */}
                                                            <div className="space-y-2 mb-4">
                                                                {section.schedules && section.schedules.length > 0 ? (
                                                                    section.schedules.map((schedule, sIdx) => (
                                                                        <div key={sIdx} className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/60">
                                                                            <Calendar size={14} className="text-indigo-500 dark:text-indigo-400" />
                                                                            <span className="font-medium text-gray-700 dark:text-white/80 capitalize">{schedule.day}</span>
                                                                            <span className="text-gray-300 dark:text-white/30 text-xs">•</span>
                                                                            <span>{schedule.start_time} - {schedule.end_time}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-white/60">
                                                                        <Calendar size={14} className="text-gray-300 dark:text-white/20" />
                                                                        <span className="italic opacity-50">TBA</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/60 pt-1">
                                                                    <Users size={14} className="text-pink-500 dark:text-pink-400" />
                                                                    <span>{section.lecturer_name || <span className="italic text-gray-400 dark:text-white/30">Unassigned</span>}</span>
                                                                </div>
                                                            </div>

                                                            {/* Progress Bar */}
                                                            <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-5">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${Math.min(percentFull, 100)}%` }}
                                                                />
                                                            </div>

                                                            {/* Actions Overlay (Always visible on mobile, hover on desktop) */}
                                                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onViewStudents(section.id); }}
                                                                    className="p-2 rounded-lg text-gray-400 dark:text-white/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                                    title="View Students"
                                                                >
                                                                    <Users size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onEdit(section.id); }}
                                                                    className="p-2 rounded-lg text-gray-400 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                                    title="Edit Section"
                                                                >
                                                                    <Edit size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
                                                                    className="p-2 rounded-lg text-gray-400 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                                    title="Delete Section"
                                                                >
                                                                    <Trash2 size={18} />
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
        </div>
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
        'bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-100',
        'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-100',
        'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-100',
        'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:border-fuchsia-700 dark:text-fuchsia-100',
        'bg-pink-100 border-pink-300 text-pink-900 dark:bg-pink-900/40 dark:border-pink-700 dark:text-pink-100',
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
                                                    relative cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-opacity-50 ring-indigo-500
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
                return <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">Active</span>;
            case 'upcoming':
                return <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">Upcoming</span>;
            case 'archived':
                return <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">Archived</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-500" /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Academic Sessions</h3>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                    <Plus className="w-4 h-4" />
                    Create Session
                </button>
            </div>

            {sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sessions created yet</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sessions.map((session) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-200 dark:border-gray-600"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{session.code}</h4>
                                            {getStatusBadge(session.status)}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{session.name}</p>
                                        {session.start_date && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(session.start_date).toLocaleDateString()} - {new Date(session.end_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {session.status !== 'active' && (
                                        <button
                                            onClick={() => handleActivate(session.id)}
                                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition"
                                        >
                                            Activate
                                        </button>
                                    )}
                                    {session.status === 'active' && (
                                        <button
                                            onClick={() => handleArchive(session.id)}
                                            className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                                        >
                                            Archive
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openEditModal(session)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
                <form onSubmit={editingSession ? handleUpdate : handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Session Code (e.g., 1225, 0526)
                        </label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="0526"
                            required
                            disabled={editingSession}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Session Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="May 2026 - September 2026"
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Clone from existing session (only for new sessions) */}
                    {!editingSession && sessions.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                                📋 Clone Sections From (Optional)
                            </label>
                            <select
                                value={formData.clone_from_session_id}
                                onChange={(e) => setFormData({ ...formData, clone_from_session_id: e.target.value })}
                                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Don't clone - Start fresh</option>
                                {sessions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.code} - {s.name} ({s.status})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                This will copy all sections (with schedules & lecturers) to the new session.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreateModal(false);
                                setEditingSession(null);
                                setFormData({ code: '', name: '', start_date: '', end_date: '', status: 'upcoming', clone_from_session_id: '' });
                            }}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                        >
                            {editingSession ? 'Save Changes' : 'Create Session'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

