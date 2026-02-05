import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors duration-200 
                ${theme === 'dark'
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-purple-600 shadow-sm border border-gray-200'} 
                ${className}`}
            aria-label="Toggle Dark Mode"
        >
            {theme === 'dark' ? (
                <Sun key="sun" className="w-5 h-5" />
            ) : (
                <Moon key="moon" className="w-5 h-5" />
            )}
        </button>
    );
};

export default ThemeToggle;
