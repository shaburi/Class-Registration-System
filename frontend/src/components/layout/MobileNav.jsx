import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Calendar, RefreshCw, FileCheck } from 'lucide-react';

const MobileNav = ({ role }) => {
    const mobileMenuItems = {
        student: [
            { path: '/student/dashboard', label: 'Home', icon: Home },
            { path: '/student/register', label: 'Register', icon: BookOpen },
            { path: '/student/timetable', label: 'Schedule', icon: Calendar },
            { path: '/student/requests', label: 'Requests', icon: RefreshCw },
        ],
        lecturer: [
            { path: '/lecturer/dashboard', label: 'Home', icon: Home },
            { path: '/lecturer/approvals', label: 'Approvals', icon: FileCheck },
            { path: '/lecturer/schedule', label: 'Schedule', icon: Calendar },
        ],
        hop: [
            { path: '/hop/dashboard', label: 'Home', icon: Home },
            { path: '/hop/subjects', label: 'Subjects', icon: BookOpen },
            { path: '/hop/requests', label: 'Requests', icon: FileCheck },
            { path: '/hop/timetable', label: 'Timetable', icon: Calendar },
        ],
    };

    const items = mobileMenuItems[role] || [];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
            <ul className="flex justify-around items-center px-2 py-2">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${isActive
                                        ? 'text-primary-700 bg-primary-50'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`
                                }
                            >
                                <Icon size={20} />
                                <span className="text-xs font-medium">{item.label}</span>
                            </NavLink>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

MobileNav.propTypes = {
    role: PropTypes.oneOf(['student', 'lecturer', 'hop']).isRequired,
};

export default MobileNav;
