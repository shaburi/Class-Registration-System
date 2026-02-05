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
            whileHover={{ y: -5 }}
            className={`
                relative glass-card p-6 rounded-2xl flex items-center gap-4 border-l-4 overflow-hidden
                ${color === 'indigo' ? 'border-l-indigo-500' : ''}
                ${color === 'purple' ? 'border-l-purple-500' : ''}
                ${color === 'cyan' ? 'border-l-cyan-500' : ''}
                ${color === 'pink' ? 'border-l-pink-500' : ''}
            `}
        >
            {/* Spotlight Gradient */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,.1), transparent 40%)`,
                }}
            />

            <div className={`p-3 rounded-xl relative z-10 ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400' :
                    color === 'purple' ? 'bg-purple-500/10 text-purple-500 dark:text-purple-400' :
                        color === 'cyan' ? 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400' :
                            'bg-pink-500/10 text-pink-500 dark:text-pink-400'
                }`}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] font-heading">
                    <AnimatedCounter value={value} />
                </p>
            </div>
        </motion.div>
    );
};

export default StatsCard;
