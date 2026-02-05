import PropTypes from 'prop-types';

const StatCard = ({ label, value, icon, color = 'primary' }) => {
    const colorClasses = {
        primary: 'bg-primary-50 text-primary-700',
        green: 'bg-green-50 text-green-700',
        orange: 'bg-orange-50 text-orange-700',
        red: 'bg-red-50 text-red-700',
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 font-medium">{label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                </div>
                {icon && (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

StatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.node,
    color: PropTypes.oneOf(['primary', 'green', 'orange', 'red']),
};

export default StatCard;
