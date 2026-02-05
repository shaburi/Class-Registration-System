import React, { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

const InteractiveGrid = () => {
    const gridRef = useRef(null);

    useEffect(() => {
        const wrapper = gridRef.current;
        if (!wrapper) return;

        // Calculate grid dimensions
        let columns = Math.floor(window.innerWidth / 50);
        let rows = Math.floor(window.innerHeight / 50);

        // Re-calculate on resize
        const handleResize = () => {
            wrapper.innerHTML = '';
            columns = Math.floor(window.innerWidth / 50);
            rows = Math.floor(window.innerHeight / 50);
            createGrid();
        };

        let toggled = false;

        const handleOnClick = index => {
            toggled = !toggled;

            animate('.tile', {
                opacity: toggled ? 0 : 1,
                delay: stagger(50, {
                    grid: [columns, rows],
                    from: index
                })
            })
        }

        const createTile = (index) => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.onclick = e => handleOnClick(index);
            return tile;
        }

        const createGrid = () => {
            wrapper.innerHTML = '';
            const total = columns * rows;

            wrapper.style.setProperty('--columns', columns);
            wrapper.style.setProperty('--rows', rows);

            for (let i = 0; i < total; i++) {
                wrapper.appendChild(createTile(i));
            }
        }

        createGrid();
        window.addEventListener('resize', handleResize);

        // Standard gentle pulse animation
        const pulseAnim = animate('.tile', {
            scale: [
                { value: 0.1, easing: 'easeOutSine', duration: 500 },
                { value: 1, easing: 'easeInOutQuad', duration: 1200 }
            ],
            opacity: [0, 0.3], // subtle visibility
            delay: stagger(200, { grid: [columns, rows], from: 'center' }),
            loop: true,
            direction: 'alternate',
            autoplay: true
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            pulseAnim.pause();
        };
    }, []);

    // Add CSS for the grid
    return (
        <div className="fixed inset-0 z-0 overflow-hidden opacity-20">
            <style>{`
                .tile {
                    position: relative;
                    width: calc(100vw / var(--columns));
                    height: calc(100vh / var(--rows));
                    border: 0.5px solid rgba(100, 100, 255, 0.1); 
                    float: left;
                    box-sizing: border-box;
                }
                .tile:before {
                    content: '';
                    position: absolute;
                    inset: 4px;
                    background: rgb(99, 102, 241); /* Indigo-500 */
                    border-radius: 4px;
                    transform: scale(0);
                    transition: transform 300ms;
                }
                .tile:hover:before {
                     transform: scale(1);
                }
             `}</style>
            <div ref={gridRef} id="tiles" className="w-full h-full" />
        </div>
    );
};

export default InteractiveGrid;
