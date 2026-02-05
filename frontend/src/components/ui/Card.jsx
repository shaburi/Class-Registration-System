import PropTypes from 'prop-types';

const Card = ({ title, icon, footer, children, className = '' }) => {
    return (
        <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 ${className}`}>
            {(title || icon) && (
                <div className="p-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {icon && <div className="text-primary-600 flex-shrink-0">{icon}</div>}
                        {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                    </div>
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
            {footer && (
                <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
                    {footer}
                </div>
            )}
        </div>
    );
};

Card.propTypes = {
    title: PropTypes.string,
    icon: PropTypes.node,
    footer: PropTypes.node,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default Card;
