import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Calendar, RefreshCw, User, Users, FileCheck, Globe, BarChart3 } from 'lucide-react';

const Sidebar = ({ role }) => {
    const menuItems = {
        student: [
            { path: '/student/dashboard', label: 'Dashboard', icon: Home },
            { path: '/student/register', label: 'Register', icon: BookOpen },
            { path: '/student/timetable', label: 'My Timetable', icon: Calendar },
            { path: '/student/requests', label: 'Requests', icon: RefreshCw },
            { path: '/student/profile', label: 'Profile', icon: User },
        ],
        lecturer: [
            { path: '/lecturer/dashboard', label: 'Dashboard', icon: Home },
            { path: '/lecturer/subjects', label: 'My Subjects', icon: BookOpen },
            { path: '/lecturer/approvals', label: 'Approvals', icon: FileCheck },
            { path: '/lecturer/schedule', label: 'Schedule', icon: Calendar },
        ],
        hop: [
            { path: '/hop/dashboard', label: 'Dashboard', icon: Home },
            { path: '/hop/subjects', label: 'Subjects', icon: BookOpen },
            { path: '/hop/lecturers', label: 'Lecturers', icon: Users },
            { path: '/hop/requests', label: 'Requests', icon: FileCheck },
            { path: '/hop/timetable', label: 'Global Timetable', icon: Globe },
            { path: '/hop/reports', label: 'Reports', icon: BarChart3 },
        ],
    };

    const items = menuItems[role] || [];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white h-screen border-r border-gray-200 fixed left-0 top-0">
            {/* Logo/Header */}
            <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-primary-600">UPTM CRS</h1>
                <p className="text-sm text-gray-500 mt-1 capitalize">{role} Portal</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-2">
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                        isActive
                                            ? 'flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-50 text-primary-700 font-medium'
                                            : 'flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors'
                                    }
                                >
                                    <Icon size={20} />
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Profile (bottom) */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                        {role[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Demo User</p>
                        <p className="text-xs text-gray-500 capitalize">{role}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

Sidebar.propTypes = {
    role: PropTypes.oneOf(['student', 'lecturer', 'hop']).isRequired,
};

export default Sidebar;
