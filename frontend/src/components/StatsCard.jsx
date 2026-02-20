import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

const StatsCard = ({ icon, title, value, color }) => {
    const divRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e) => {
        if (!divRef.current || isFocused) return;

        const div = divRef.current;
        const rect = div.getBoundingClientRect();

        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setIsFocused(true);
        setOpacity(1);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setOpacity(0);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <motion.div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            whileHover={{ y: -5, scale: 1.02 }}
            className={`
                relative bg-white/80 dark:bg-[#0b0d14]/80 backdrop-blur-xl p-6 rounded-[24px] flex items-center gap-5 overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-gray-200/50 dark:border-white/5 transition-all duration-300 group
                ${color === 'indigo' ? 'hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10' : ''}
                ${color === 'purple' ? 'hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:border-purple-500/30 hover:bg-purple-50/50 dark:hover:bg-purple-900/10' : ''}
                ${color === 'cyan' ? 'hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/30 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10' : ''}
                ${color === 'pink' ? 'hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-900/10' : ''}
            `}
        >
            {/* Spotlight Gradient */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-0"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.08), transparent 40%)`,
                }}
            />

            {/* Top edge inner glow */}
            <div className="absolute inset-0 rounded-[24px] pointer-events-none border-t border-white/50 dark:border-white/10 opacity-50 group-hover:opacity-100 transition-opacity"></div>

            <div className={`p-4 rounded-xl relative z-10 shadow-inner backdrop-blur-md border border-gray-200/50 dark:border-white/5 transition-transform duration-300 group-hover:scale-110 ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-700 dark:group-hover:text-indigo-300' :
                color === 'purple' ? 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300' :
                    color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300' :
                        'bg-pink-500/10 text-pink-600 dark:text-pink-400 group-hover:bg-pink-500/20 group-hover:text-pink-700 dark:group-hover:text-pink-300'
                }`}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white font-heading tracking-tight drop-shadow-sm dark:drop-shadow-md">
                    <AnimatedCounter value={value} />
                </p>
            </div>
        </motion.div>
    );
};

export default StatsCard;
