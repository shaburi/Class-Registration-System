import PropTypes from 'prop-types';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const MainLayout = ({ role, children }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <Sidebar role={role} />

            {/* Main Content */}
            <div className="md:ml-64 pb-16 md:pb-0">
                <main className="p-4 md:p-8">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <MobileNav role={role} />
        </div>
    );
};

MainLayout.propTypes = {
    role: PropTypes.oneOf(['student', 'lecturer', 'hop']).isRequired,
    children: PropTypes.node.isRequired,
};

export default MainLayout;
