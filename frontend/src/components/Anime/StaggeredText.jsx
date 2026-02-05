import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

const StaggeredText = ({ text, className = '' }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Reset opacity before animating
        const letters = containerRef.current.querySelectorAll('.letter');
        animate(letters, { opacity: 0, translateY: 20, duration: 0 });

        animate(letters, {
            opacity: [0, 1],
            translateY: [20, 0],
            translateZ: 0,
            scale: [0.5, 1],
            easing: "easeOutExpo",
            duration: 950,
            delay: (el, i) => 30 * i
        });
    }, [text]);

    return (
        <div className={`overflow-hidden ${className}`} ref={containerRef} aria-label={text}>
            {text.split('').map((char, index) => (
                <span key={index} className="letter inline-block" style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}>
                    {char}
                </span>
            ))}
        </div>
    );
};

export default StaggeredText;
