import React from 'react';
import { Construction } from 'lucide-react';

const PlaceholderTab = ({ title, message }) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <Construction className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md text-center">
                {message || "This section is currently being refactored and will be available shortly."}
            </p>
        </div>
    );
};

export default PlaceholderTab;
