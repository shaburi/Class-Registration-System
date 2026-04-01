import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Accent color presets
export const ACCENT_COLORS = {
    indigo: {
        name: 'Indigo',
        gradient: 'bg-indigo-600',
        bg: 'bg-indigo-600',
        text: 'text-indigo-600 dark:text-indigo-400',
        hover: 'hover:bg-indigo-500/10',
        ring: 'ring-indigo-600',
        shadow: 'shadow-none',
        primary: '#4f46e5',
    },
    purple: {
        name: 'Purple',
        gradient: 'bg-purple-600',
        bg: 'bg-purple-600',
        text: 'text-purple-600 dark:text-purple-400',
        hover: 'hover:bg-purple-500/10',
        ring: 'ring-purple-600',
        shadow: 'shadow-none',
        primary: '#9333ea',
    },
    pink: {
        name: 'Pink',
        gradient: 'bg-pink-600',
        bg: 'bg-pink-600',
        text: 'text-pink-600 dark:text-pink-400',
        hover: 'hover:bg-pink-500/10',
        ring: 'ring-pink-600',
        shadow: 'shadow-none',
        primary: '#db2777',
    },
    blue: {
        name: 'Blue',
        gradient: 'bg-blue-600',
        bg: 'bg-blue-600',
        text: 'text-blue-600 dark:text-blue-400',
        hover: 'hover:bg-blue-500/10',
        ring: 'ring-blue-600',
        shadow: 'shadow-none',
        primary: '#2563eb',
    },
    green: {
        name: 'Green',
        gradient: 'bg-emerald-600',
        bg: 'bg-emerald-600',
        text: 'text-emerald-600 dark:text-emerald-400',
        hover: 'hover:bg-emerald-500/10',
        ring: 'ring-emerald-600',
        shadow: 'shadow-none',
        primary: '#059669',
    },
    teal: {
        name: 'Teal',
        gradient: 'bg-teal-600',
        bg: 'bg-teal-600',
        text: 'text-teal-600 dark:text-teal-400',
        hover: 'hover:bg-teal-500/10',
        ring: 'ring-teal-600',
        shadow: 'shadow-none',
        primary: '#0d9488',
    },
    orange: {
        name: 'Orange',
        gradient: 'bg-orange-600',
        bg: 'bg-orange-600',
        text: 'text-orange-600 dark:text-orange-400',
        hover: 'hover:bg-orange-500/10',
        ring: 'ring-orange-600',
        shadow: 'shadow-none',
        primary: '#ea580c',
    },
    red: {
        name: 'Red',
        gradient: 'bg-red-600',
        bg: 'bg-red-600',
        text: 'text-red-600 dark:text-red-400',
        hover: 'hover:bg-red-500/10',
        ring: 'ring-red-600',
        shadow: 'shadow-none',
        primary: '#dc2626',
    },
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // Check localStorage or system preference on initial load
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            return 'dark';
        }
        return 'light';
    });

    const [accentColor, setAccentColor] = useState(() => {
        // Default accent color based on nothing, or load from localStorage
        const saved = localStorage.getItem('accentColor');
        if (saved && ACCENT_COLORS[saved]) {
            return saved;
        }
        return 'blue'; // Default
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('accentColor', accentColor);
        // Set CSS custom property for accent color
        document.documentElement.style.setProperty('--accent-primary', ACCENT_COLORS[accentColor].primary);
    }, [accentColor]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const accent = ACCENT_COLORS[accentColor];

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            accentColor,
            setAccentColor,
            accent,
            accentColors: ACCENT_COLORS
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

