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

    // Navigate to relevant tab and scroll target into view
    useEffect(() => {
        if (step.id === 'register' && onTabChange) {
            // Don't change tab, just highlight nav
        }

        // Scroll the target element into view so it's never cut off
        if (step.target) {
            const el = document.querySelector(step.target);
            if (el) {
                // Use a slight delay to allow any layout shifts to complete
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        } else {
             window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step.id, step.target, onTabChange]);

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
                                // Create the spotlight cutout directly with a stark dark surround
                                boxShadow: `0 0 0 99999px var(--tour-overlay-color, rgba(0, 0, 0, 0.75))`,
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
                            className="fixed inset-0 bg-black/75 dark:bg-black/85 backdrop-blur-sm"
                            style={{ zIndex: 99998 }}
                        />
                    )}

                    {/* Click blocker over the whole viewport */}
                    <div
                        className="fixed inset-0"
                        style={{ zIndex: 99998 }}
                        onClick={(e) => e.stopPropagation()}
                    />

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
                            bg-white dark:bg-[#0b0c10]
                            border border-gray-200 dark:border-gray-800
                            rounded-xl
                            shadow-2xl
                            overflow-hidden
                            ${isCenterStep ? 'text-center' : ''}
                        `}
                            style={isCenterStep ? { width: '90vw', maxWidth: '440px' } : {}}
                        >
                            {/* Progress bar at top */}
                            <div className="h-1 bg-gray-100 dark:bg-gray-900">
                                <motion.div
                                    className="h-full bg-gray-900 dark:bg-white"
                                    initial={{ width: `${(currentStep / TUTORIAL_STEPS.length) * 100}%` }}
                                    animate={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>

                            <div className={`p-6 ${isCenterStep ? 'py-8' : ''}`}>
                                {/* Icon */}
                                <div className={`
                                    w-12 h-12 rounded-lg
                                    bg-gray-100 dark:bg-gray-900
                                    flex items-center justify-center 
                                    text-gray-900 dark:text-gray-100
                                    mb-5
                                    ${isCenterStep ? 'mx-auto w-16 h-16' : ''}
                                `}>
                                    {isCenterStep ? <PartyPopper size={28} /> : step.icon}
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
                                <div className={`flex items-center ${isCenterStep ? 'justify-center' : 'justify-between'} gap-3 mt-8`}>
                                    {!isLastStep && (
                                        <button
                                            onClick={handleSkip}
                                            className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            Skip tour
                                        </button>
                                    )}

                                    <button
                                        onClick={handleNext}
                                        className={`
                                            flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95
                                            bg-gray-900 text-white hover:bg-black
                                            dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100
                                            border-none outline-none
                                            ${isCenterStep ? 'px-8 py-3 text-base w-full' : ''}
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
                                    <div className="flex items-center justify-center gap-1.5 mt-6 pt-5 border-t border-gray-100 dark:border-gray-900/50">
                                        {TUTORIAL_STEPS.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`
                                                    h-1.5 rounded-full transition-all duration-300
                                                    ${idx === currentStep
                                                        ? 'w-6 bg-gray-900 dark:bg-white'
                                                        : idx < currentStep
                                                            ? 'w-1.5 bg-gray-600 dark:bg-gray-300'
                                                            : 'w-1.5 bg-gray-200 dark:bg-gray-800'
                                                    }
                                                `}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* CSS for overlay variable */}
                    <style>{`
                        :root {
                            --tour-overlay-color: rgba(0, 0, 0, 0.65);
                        }
                        .dark {
                            --tour-overlay-color: rgba(0, 0, 0, 0.85);
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
