import PropTypes from 'prop-types';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const Badge = ({ status, children }) => {
    const statusConfig = {
        pending: {
            className: 'bg-yellow-100 text-yellow-800',
            icon: Clock,
        },
        approved: {
            className: 'bg-green-100 text-green-800',
            icon: CheckCircle,
        },
        rejected: {
            className: 'bg-red-100 text-red-800',
            icon: XCircle,
        },
        full: {
            className: 'bg-orange-100 text-orange-800',
            icon: AlertCircle,
        },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
            <Icon size={14} />
            {children}
        </span>
    );
};

Badge.propTypes = {
    status: PropTypes.oneOf(['pending', 'approved', 'rejected', 'full']).isRequired,
    children: PropTypes.node.isRequired,
};

export default Badge;
