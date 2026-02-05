import MainLayout from '../../components/layout/MainLayout';
import StatCard from '../../components/dashboard/StatCard';
import SubjectCard from '../../components/dashboard/SubjectCard';
import Card from '../../components/ui/Card';
import { BookOpen, CheckCircle, Clock, Calendar } from 'lucide-react';

const StudentDashboard = () => {
    // Mock data
    const stats = [
        { label: 'Registered Subjects', value: '5/6', icon: <BookOpen size={24} />, color: 'primary' },
        { label: 'Pending Requests', value: '2', icon: <Clock size={24} />, color: 'orange' },
        { label: 'Approved', value: '3', icon: <CheckCircle size={24} />, color: 'green' },
    ];

    const availableSubjects = [
        {
            code: 'CSC101',
            name: 'Introduction to Programming',
            section: 'A',
            capacity: { current: 12, max: 30 },
            schedule: ['Mon 09:00-11:00', 'Wed 14:00-16:00'],
            lecturer: 'Dr. Smith',
            room: 'A101',
        },
        {
            code: 'MAT202',
            name: 'Calculus II',
            section: 'B',
            capacity: { current: 28, max: 30 },
            schedule: ['Tue 10:00-12:00', 'Thu 10:00-12:00'],
            lecturer: 'Prof. Johnson',
            room: 'B205',
        },
        {
            code: 'PHY303',
            name: 'Physics for Engineers',
            section: 'C',
            capacity: { current: 30, max: 30 },
            schedule: ['Mon 14:00-16:00', 'Fri 09:00-11:00'],
            lecturer: 'Dr. Williams',
            room: 'C112',
        },
    ];

    const handleRegister = (subject) => {
        alert(`Registering for ${subject.code}`);
    };

    const handleRequestJoin = (subject) => {
        alert(`Requesting to join ${subject.code}`);
    };

    return (
        <MainLayout role="student">
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Welcome, Student!</h1>
                <p className="text-gray-600 mt-2">Student ID: 2024001234</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            {/* Available Subjects */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen size={28} />
                    Available Subjects
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableSubjects.map((subject, idx) => (
                        <SubjectCard
                            key={idx}
                            subject={subject}
                            hasClash={subject.code === 'PHY303'} // Mock clash for demo
                            onRegister={() => handleRegister(subject)}
                            onRequestJoin={() => handleRequestJoin(subject)}
                        />
                    ))}
                </div>
            </div>

            {/* My Timetable Preview */}
            <Card
                title="My Timetable"
                icon={<Calendar size={20} />}
            >
                <div className="text-center py-8 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Your timetable will appear here once you register for subjects.</p>
                    <p className="text-sm mt-2">Navigate to "My Timetable" to see the full week view.</p>
                </div>
            </Card>
        </MainLayout>
    );
};

export default StudentDashboard;
