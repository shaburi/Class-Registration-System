import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Sparkles, Calendar, FileText, CalendarDays,
    User, ChevronRight, X, PartyPopper, Rocket
} from 'lucide-react';

// Tutorial step definitions
const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        target: '[data-tour="welcome-header"]',
        title: 'Welcome to UPTM HUB! 👋',
        description: 'Let\'s take a quick tour to help you get started with course registration. It\'ll only take a minute!',
        icon: <Rocket size={24} />,
        placement: 'bottom',
    },
    {
        id: 'register',
        target: '[data-tour="nav-browse"]',
        title: 'Register Courses 📚',
        description: 'Browse all available course sections here. Filter by semester, search for subjects, and register with one click.',
        icon: <BookOpen size={24} />,
        placement: 'right',
    },
    {
        id: 'builder',
        target: '[data-tour="nav-builder"]',
        title: 'Build Your Timetable ✨',
        description: 'Visually plan your ideal schedule. Drag and drop courses, check for conflicts, then register them all at once.',
        icon: <Sparkles size={24} />,
        placement: 'right',
    },
    {
        id: 'timetable',
        target: '[data-tour="nav-timetable"]',
        title: 'My Timetable 📅',
        description: 'View your registered courses in a weekly grid. You can swap sections or drop courses directly from here.',
        icon: <Calendar size={24} />,
        placement: 'right',
    },
    {
        id: 'requests',
        target: '[data-tour="nav-requests"]',
        title: 'Track Your Requests 📝',
        description: 'Monitor the status of your swap, drop, and manual join requests. All updates appear here in real-time.',
        icon: <FileText size={24} />,
        placement: 'right',
    },
    {
        id: 'session',
        target: '[data-tour="session-selector"]',
        title: 'Academic Session 🗓️',
        description: 'Switch between academic sessions to view past or upcoming registrations. The active session is highlighted.',
        icon: <CalendarDays size={24} />,
        placement: 'bottom-end',
    },
    {
        id: 'profile',
        target: '[data-tour="profile-pod"]',
        title: 'Your Profile 👤',
        description: 'Access your settings, change themes, set up your profile, or log out. Make it yours!',
        icon: <User size={24} />,
        placement: 'right',
    },
    {
        id: 'done',
        target: null, // No target — centered modal
        title: 'You\'re All Set! 🎉',
        description: 'You\'re ready to start registering for courses. You can always replay this tour from Settings.',
        icon: <PartyPopper size={24} />,
        placement: 'center',
    },
];

const STORAGE_KEY = 'uptm_hub_tutorial_done';

const OnboardingTutorial = ({ onComplete, onTabChange }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [isVisible, setIsVisible] = useState(true);
    const tooltipRef = useRef(null);

    const step = TUTORIAL_STEPS[currentStep];
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
    const isCenterStep = step.placement === 'center';

    // Measure target element
    const measureTarget = useCallback(() => {
        if (!step.target) {
            setTargetRect(null);
            return;
        }
        const el = document.querySelector(step.target);
        if (el) {
            const rect = el.getBoundingClientRect();
            setTargetRect({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                x: rect.x,
                y: rect.y,
            });
        } else {
            setTargetRect(null);
        }
    }, [step.target]);

    useEffect(() => {
        measureTarget();
        // Re-measure on resize/scroll
        window.addEventListener('resize', measureTarget);
        window.addEventListener('scroll', measureTarget, true);
        return () => {
            window.removeEventListener('resize', measureTarget);
            window.removeEventListener('scroll', measureTarget, true);
        };
    }, [measureTarget, currentStep]);

    // Navigate to relevant tab for step context
    useEffect(() => {
        if (step.id === 'register' && onTabChange) {
            // Don't change tab, just highlight nav
        }
    }, [step.id, onTabChange]);

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
        setTimeout(() => {
            onComplete?.();
        }, 300);
    };

    // Calculate tooltip position
    const getTooltipStyle = () => {
        if (isCenterStep || !targetRect) {
            return {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            };
        }

        const padding = 16;
        const tooltipWidth = 380;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top, left;

        switch (step.placement) {
            case 'right':
                top = targetRect.top + targetRect.height / 2;
                left = targetRect.left + targetRect.width + padding;
                // If overflows right edge, place below instead
                if (left + tooltipWidth > viewportWidth - padding) {
                    top = targetRect.top + targetRect.height + padding;
                    left = Math.max(padding, targetRect.left);
                }
                return {
                    position: 'fixed',
                    top: `${Math.min(top, viewportHeight - 250)}px`,
                    left: `${left}px`,
                    transform: 'translateY(-50%)',
                };
            case 'bottom':
                top = targetRect.top + targetRect.height + padding;
                left = targetRect.left;
                return {
                    position: 'fixed',
                    top: `${top}px`,
                    left: `${Math.max(padding, left)}px`,
                };
            case 'bottom-end':
                top = targetRect.top + targetRect.height + padding;
                left = targetRect.left + targetRect.width - tooltipWidth;
                return {
                    position: 'fixed',
                    top: `${top}px`,
                    left: `${Math.max(padding, left)}px`,
                };
            default:
                top = targetRect.top + targetRect.height + padding;
                left = targetRect.left;
                return {
                    position: 'fixed',
                    top: `${top}px`,
                    left: `${Math.max(padding, left)}px`,
                };
        }
    };

    // Spotlight cutout dimensions (with padding around the target)
    const spotlightPadding = 8;
    const spotlightBorderRadius = 16;

    const overlay = (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[99999]"
                    style={{ pointerEvents: 'auto' }}
                >
                    {/* Overlay with spotlight cutout using box-shadow */}
                    {targetRect && !isCenterStep ? (
                        <div
                            className="fixed inset-0"
                            style={{
                                // Create the spotlight cutout with an inset-shaped box-shadow
                                boxShadow: `
                                    0 0 0 4px rgba(59, 130, 246, 0.5),
                                    0 0 0 99999px var(--tour-overlay-color, rgba(0, 0, 0, 0.6))
                                `,
                                position: 'fixed',
                                top: targetRect.top - spotlightPadding,
                                left: targetRect.left - spotlightPadding,
                                width: targetRect.width + spotlightPadding * 2,
                                height: targetRect.height + spotlightPadding * 2,
                                borderRadius: `${spotlightBorderRadius}px`,
                                zIndex: 99998,
                                pointerEvents: 'none',
                                transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                        />
                    ) : (
                        <div
                            className="fixed inset-0 bg-black/60 dark:bg-black/70"
                            style={{ zIndex: 99998 }}
                        />
                    )}

                    {/* Click blocker over the whole viewport */}
                    <div
                        className="fixed inset-0"
                        style={{ zIndex: 99998 }}
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Spotlight ring glow animation */}
                    {targetRect && !isCenterStep && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={`spotlight-${currentStep}`}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed pointer-events-none"
                            style={{
                                top: targetRect.top - spotlightPadding - 2,
                                left: targetRect.left - spotlightPadding - 2,
                                width: targetRect.width + (spotlightPadding + 2) * 2,
                                height: targetRect.height + (spotlightPadding + 2) * 2,
                                borderRadius: `${spotlightBorderRadius + 2}px`,
                                border: '2px solid rgba(59, 130, 246, 0.4)',
                                zIndex: 99999,
                                animation: 'tour-pulse 2s ease-in-out infinite',
                            }}
                        />
                    )}

                    {/* Tooltip Card */}
                    <motion.div
                        ref={tooltipRef}
                        key={`tooltip-${currentStep}`}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                        style={{
                            ...getTooltipStyle(),
                            zIndex: 100000,
                            ...(isCenterStep ? {} : { maxWidth: '380px', width: '90vw' })
                        }}
                    >
                        <div className={`
                            bg-white/95 dark:bg-[#14161f]/95 
                            backdrop-blur-2xl 
                            border border-gray-200/80 dark:border-white/10 
                            rounded-2xl 
                            shadow-[0_25px_60px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)]
                            overflow-hidden
                            ${isCenterStep ? 'text-center' : ''}
                        `}
                            style={isCenterStep ? { width: '90vw', maxWidth: '440px' } : {}}
                        >
                            {/* Progress bar at top */}
                            <div className="h-1 bg-gray-100 dark:bg-white/5">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500"
                                    initial={{ width: `${(currentStep / TUTORIAL_STEPS.length) * 100}%` }}
                                    animate={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>

                            <div className={`p-6 ${isCenterStep ? 'py-8' : ''}`}>
                                {/* Icon */}
                                <div className={`
                                    w-12 h-12 rounded-xl 
                                    bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20
                                    border border-blue-500/20 dark:border-blue-400/20
                                    flex items-center justify-center 
                                    text-blue-600 dark:text-blue-400
                                    mb-4
                                    ${isCenterStep ? 'mx-auto w-16 h-16 rounded-2xl' : ''}
                                `}>
                                    {isCenterStep ? <PartyPopper size={32} /> : step.icon}
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                                    {step.title}
                                </h3>

                                {/* Description */}
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                                    {step.description}
                                </p>

                                {/* Actions */}
                                <div className={`flex items-center ${isCenterStep ? 'justify-center' : 'justify-between'} gap-3`}>
                                    {!isLastStep && (
                                        <button
                                            onClick={handleSkip}
                                            className="text-sm font-medium text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                        >
                                            Skip tour
                                        </button>
                                    )}

                                    <button
                                        onClick={handleNext}
                                        className={`
                                            flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95
                                            bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-500 dark:to-blue-600
                                            text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20
                                            hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5
                                            ${isCenterStep ? 'px-8 py-3 text-base' : ''}
                                        `}
                                    >
                                        {isLastStep ? (
                                            <>
                                                <Rocket size={16} />
                                                Start Exploring
                                            </>
                                        ) : (
                                            <>
                                                Got it
                                                <ChevronRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Step counter */}
                                {!isCenterStep && (
                                    <div className="flex items-center justify-center gap-1.5 mt-5">
                                        {TUTORIAL_STEPS.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`
                                                    h-1.5 rounded-full transition-all duration-300
                                                    ${idx === currentStep
                                                        ? 'w-6 bg-blue-500 dark:bg-blue-400'
                                                        : idx < currentStep
                                                            ? 'w-1.5 bg-blue-300 dark:bg-blue-600'
                                                            : 'w-1.5 bg-gray-200 dark:bg-white/10'
                                                    }
                                                `}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* CSS for pulse animation and overlay color variable */}
                    <style>{`
                        @keyframes tour-pulse {
                            0%, 100% { opacity: 0.6; transform: scale(1); }
                            50% { opacity: 1; transform: scale(1.02); }
                        }
                        :root {
                            --tour-overlay-color: rgba(0, 0, 0, 0.55);
                        }
                        .dark {
                            --tour-overlay-color: rgba(0, 0, 0, 0.7);
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(overlay, document.body);
};

// Helper to check if tutorial should be shown
export const shouldShowTutorial = () => {
    return !localStorage.getItem(STORAGE_KEY);
};

// Helper to reset tutorial (for "Replay" from Settings)
export const resetTutorial = () => {
    localStorage.removeItem(STORAGE_KEY);
};

export default OnboardingTutorial;
