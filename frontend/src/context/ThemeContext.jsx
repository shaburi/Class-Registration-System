import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Accent color presets
export const ACCENT_COLORS = {
    indigo: {
        name: 'Indigo',
        gradient: 'from-indigo-600 via-purple-600 to-pink-500',
        bg: 'bg-indigo-500',
        text: 'text-indigo-400',
        hover: 'hover:bg-indigo-500/10',
        ring: 'ring-indigo-500',
        primary: '#6366f1',
    },
    purple: {
        name: 'Purple',
        gradient: 'from-purple-600 via-pink-600 to-rose-500',
        bg: 'bg-purple-500',
        text: 'text-purple-400',
        hover: 'hover:bg-purple-500/10',
        ring: 'ring-purple-500',
        primary: '#a855f7',
    },
    pink: {
        name: 'Pink',
        gradient: 'from-pink-600 via-rose-600 to-red-500',
        bg: 'bg-pink-500',
        text: 'text-pink-400',
        hover: 'hover:bg-pink-500/10',
        ring: 'ring-pink-500',
        primary: '#ec4899',
    },
    blue: {
        name: 'Blue',
        gradient: 'from-blue-600 via-cyan-600 to-teal-500',
        bg: 'bg-blue-500',
        text: 'text-blue-400',
        hover: 'hover:bg-blue-500/10',
        ring: 'ring-blue-500',
        primary: '#3b82f6',
    },
    green: {
        name: 'Green',
        gradient: 'from-green-600 via-emerald-600 to-teal-500',
        bg: 'bg-green-500',
        text: 'text-green-400',
        hover: 'hover:bg-green-500/10',
        ring: 'ring-green-500',
        primary: '#22c55e',
    },
    teal: {
        name: 'Teal',
        gradient: 'from-teal-600 via-cyan-600 to-sky-500',
        bg: 'bg-teal-500',
        text: 'text-teal-400',
        hover: 'hover:bg-teal-500/10',
        ring: 'ring-teal-500',
        primary: '#14b8a6',
    },
    orange: {
        name: 'Orange',
        gradient: 'from-orange-600 via-amber-600 to-yellow-500',
        bg: 'bg-orange-500',
        text: 'text-orange-400',
        hover: 'hover:bg-orange-500/10',
        ring: 'ring-orange-500',
        primary: '#f97316',
    },
    red: {
        name: 'Red',
        gradient: 'from-red-600 via-rose-600 to-pink-500',
        bg: 'bg-red-500',
        text: 'text-red-400',
        hover: 'hover:bg-red-500/10',
        ring: 'ring-red-500',
        primary: '#ef4444',
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
        return 'indigo'; // Default
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

