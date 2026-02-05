import MainLayout from '../../components/layout/MainLayout';
import StatCard from '../../components/dashboard/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { BookOpen, FileCheck, Clock, CheckCircle, XCircle } from 'lucide-react';

const LecturerDashboard = () => {
    const stats = [
        { label: 'Subjects Teaching', value: '3', icon: <BookOpen size={24} />, color: 'primary' },
        { label: 'Total Sections', value: '5', icon: <BookOpen size={24} />, color: 'green' },
        { label: 'Pending Approvals', value: '6', icon: <FileCheck size={24} />, color: 'orange' },
    ];

    const pendingRequests = [
        {
            id: 1,
            type: 'Swap',
            student: '2024001234',
            subject: 'CSC101',
            from: 'Section A',
            to: 'Section B',
            date: '2026-01-08',
        },
        {
            id: 2,
            type: 'Manual Join',
            student: '2024005678',
            subject: 'MAT202',
            section: 'Section C',
            date: '2026-01-07',
        },
        {
            id: 3,
            type: 'Swap',
            student: '2024002345',
            subject: 'PHY303',
            from: 'Section B',
            to: 'Section A',
            date: '2026-01-06',
        },
    ];

    const handleApprove = (requestId) => {
        alert(`Approving request ${requestId}`);
    };

    const handleReject = (requestId) => {
        alert(`Rejecting request ${requestId}`);
    };

    return (
        <MainLayout role="lecturer">
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Welcome, Dr. Smith!</h1>
                <p className="text-gray-600 mt-2">Lecturer Dashboard</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            {/* Pending Approvals */}
            <Card
                title="Pending Approvals"
                icon={<FileCheck size={20} />}
            >
                <div className="space-y-4">
                    {pendingRequests.map((request) => (
                        <div
                            key={request.id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge status="pending">{request.type}</Badge>
                                        <span className="text-sm text-gray-500">{request.date}</span>
                                    </div>
                                    <p className="font-medium text-gray-900">Student ID: {request.student}</p>
                                    <p className="text-sm text-gray-600">Subject: {request.subject}</p>
                                    {request.type === 'Swap' ? (
                                        <p className="text-sm text-gray-600">
                                            {request.from} → {request.to}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-600">Section: {request.section}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        icon={<CheckCircle size={16} />}
                                        onClick={() => handleApprove(request.id)}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        icon={<XCircle size={16} />}
                                        onClick={() => handleReject(request.id)}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Teaching Schedule Preview */}
            <div className="mt-8">
                <Card
                    title="My Teaching Schedule"
                    icon={<Clock size={20} />}
                >
                    <div className="text-center py-8 text-gray-500">
                        <Clock size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Your weekly teaching schedule will appear here.</p>
                        <p className="text-sm mt-2">Navigate to "Schedule" to see the full view.</p>
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
};

export default LecturerDashboard;
