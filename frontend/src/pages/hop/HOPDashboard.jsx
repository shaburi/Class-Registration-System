import MainLayout from '../../components/layout/MainLayout';
import StatCard from '../../components/dashboard/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BookOpen, Users, FileCheck, Globe, BarChart3, Plus } from 'lucide-react';

const HOPDashboard = () => {
    const stats = [
        { label: 'Total Subjects', value: '12', icon: <BookOpen size={24} />, color: 'primary' },
        { label: 'Lecturers', value: '8', icon: <Users size={24} />, color: 'green' },
        { label: 'Students Enrolled', value: '150', icon: <Users size={24} />, color: 'primary' },
        { label: 'Pending Requests', value: '15', icon: <FileCheck size={24} />, color: 'orange' },
    ];

    const recentActivities = [
        { action: 'New subject added', details: 'CSC404 - Data Structures', time: '2 hours ago' },
        { action: 'Lecturer assigned', details: 'Dr. Johnson to MAT202', time: '4 hours ago' },
        { action: 'Request approved', details: 'Student swap in PHY303', time: '1 day ago' },
        { action: 'Section capacity updated', details: 'CSC101 Section A: 25 → 30', time: '2 days ago' },
    ];

    return (
        <MainLayout role="hop">
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
                <p className="text-gray-600 mt-2">Head of Programme Dashboard</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Button variant="primary" icon={<Plus size={20} />} className="w-full">
                    Add Subject
                </Button>
                <Button variant="secondary" icon={<Users size={20} />} className="w-full">
                    Assign Lecturer
                </Button>
                <Button variant="secondary" icon={<Globe size={20} />} className="w-full">
                    View Timetable
                </Button>
                <Button variant="secondary" icon={<BarChart3 size={20} />} className="w-full">
                    Generate Report
                </Button>
            </div>

            {/* Recent Activity */}
            <Card
                title="Recent Activity"
                icon={<FileCheck size={20} />}
            >
                <div className="space-y-3">
                    {recentActivities.map((activity, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0"
                        >
                            <div>
                                <p className="font-medium text-gray-900">{activity.action}</p>
                                <p className="text-sm text-gray-600">{activity.details}</p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{activity.time}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* System Health */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Enrollment Status" icon={<BarChart3 size={20} />}>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Overall Capacity</span>
                                <span className="font-medium">150 / 200</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '75%' }} />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="Request Statistics" icon={<FileCheck size={20} />}>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Pending</span>
                            <span className="font-medium text-orange-600">15</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Approved This Week</span>
                            <span className="font-medium text-green-600">42</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Rejected This Week</span>
                            <span className="font-medium text-red-600">8</span>
                        </div>
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
};

export default HOPDashboard;
