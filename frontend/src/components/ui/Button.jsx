import PropTypes from 'prop-types';
import React from 'react';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    onClick,
    loading = false,
    disabled = false,
    icon: Icon,
    className = '',
    type = 'button'
}) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

    const variants = {
        primary: 'bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white shadow-lg shadow-blue-500/20',
        secondary: 'bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 backdrop-blur-md',
        danger: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/20',
        ghost: 'text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    // Handle icon - if it's a component (function), instantiate it; if it's already an element, use as-is
    const renderIcon = () => {
        if (!Icon) return null;

        // If it's already a React element (JSX), render it directly
        if (React.isValidElement(Icon)) {
            return <span className="flex-shrink-0">{Icon}</span>;
        }

        // If it's a component (function, class, or forwardRef), instantiate it
        if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon.$$typeof)) {
            const IconComponent = Icon;
            return <span className="flex-shrink-0"><IconComponent size={16} /></span>;
        }

        // Fallback: shouldn't reach here, but return null to avoid errors
        return null;
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {loading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : renderIcon()}
            {children}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    onClick: PropTypes.func,
    loading: PropTypes.bool,
    disabled: PropTypes.bool,
    icon: PropTypes.node,
    className: PropTypes.string,
    type: PropTypes.string,
};

export default Button;
