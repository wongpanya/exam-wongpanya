import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../config/api';

export const isMobileOrTabletDevice = () => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTouchScreen = navigator.maxTouchPoints > 1;
    const isSmallScreen = window.innerWidth <= 1024;
    return isMobileUA || (isTouchScreen && isSmallScreen);
};

export const enterFullscreen = async () => {
    try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            await elem.requestFullscreen();
            return true;
        } else if (elem.webkitRequestFullscreen) {
            await elem.webkitRequestFullscreen();
            return true;
        } else if (elem.msRequestFullscreen) {
            await elem.msRequestFullscreen();
            return true;
        }
    } catch (err) {
        console.warn('Fullscreen request failed:', err);
    }
    return false;
};

export const exitFullscreen = async () => {
    try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            }
        }
    } catch (err) {
        console.warn('Exit fullscreen failed:', err);
    }
};

const FORBIDDEN_KEYS = [
    { key: 'F12', ctrl: false, shift: false },
    { key: 'p', ctrl: true, shift: false },
    { key: 'P', ctrl: true, shift: false },
    { key: 'i', ctrl: true, shift: true },
    { key: 'I', ctrl: true, shift: true },
    { key: 'j', ctrl: true, shift: true },
    { key: 'J', ctrl: true, shift: true },
    { key: 'u', ctrl: true, shift: false },
    { key: 'U', ctrl: true, shift: false },
    { key: 'PrintScreen', ctrl: false, shift: false },
];

// Event types that count as violations (should trigger immediate flush)
const VIOLATION_TYPES = new Set([
    'tab_switch', 'blur', 'copy', 'cut', 'paste',
    'right_click', 'print_screen', 'devtools', 'forbidden_key',
    'fullscreen_exit', 'split_screen'
]);

const useAntiCheat = (examId, enabled = true, onSuspend) => {
    const [cheatCount, setCheatCount] = useState(0);
    const [isTabHidden, setIsTabHidden] = useState(false);
    const [warnings, setWarnings] = useState([]);
    const [isMobile] = useState(() => isMobileOrTabletDevice());
    const [isFullscreen, setIsFullscreen] = useState(() => {
        if (typeof document === 'undefined') return false;
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    });

    const logQueueRef = useRef([]);
    const flushTimerRef = useRef(null);
    const urgentFlushTimerRef = useRef(null);
    const onSuspendRef = useRef(onSuspend);

    // Keep isFullscreen in sync with document state
    useEffect(() => {
        const updateFullscreen = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };

        document.addEventListener('fullscreenchange', updateFullscreen);
        document.addEventListener('webkitfullscreenchange', updateFullscreen);

        return () => {
            document.removeEventListener('fullscreenchange', updateFullscreen);
            document.removeEventListener('webkitfullscreenchange', updateFullscreen);
        };
    }, []);

    // Keep onSuspend ref current to avoid stale closures
    useEffect(() => {
        onSuspendRef.current = onSuspend;
    }, [onSuspend]);

    const addWarning = (eventType, detail) => {
        const warning = {
            eventType,
            detail,
            timestamp: new Date().toISOString(),
        };
        setWarnings(prev => [...prev.slice(-19), warning]); // Keep last 20
        setCheatCount(prev => prev + 1);
    };

    const resetCheatStatus = useCallback(() => {
        setCheatCount(0);
        setWarnings([]);
        setIsTabHidden(false);
    }, []);

    const flushLogs = useCallback(async () => {
        if (logQueueRef.current.length === 0) return;

        const events = [...logQueueRef.current];
        logQueueRef.current = [];

        try {
            // Send all events as a single batch request
            const { data } = await api.post(
                `/exam-sessions/${examId}/cheat-log-batch`,
                { events }
            );

            if (data.suspendStatus === 'suspended' && onSuspendRef.current) {
                onSuspendRef.current();
            }
        } catch {
            // If network fails, put events back in queue
            logQueueRef.current = [...events, ...logQueueRef.current];
        }
    }, [examId]);

    // Queue log and flush periodically (or immediately for violations)
    const logEvent = useCallback((eventType, detail = '') => {
        logQueueRef.current.push({ eventType, detail });
        addWarning(eventType, detail);

        // If this is an immediate suspension event, flush immediately without delay
        if (eventType === 'fullscreen_exit' || eventType === 'split_screen') {
            if (urgentFlushTimerRef.current) clearTimeout(urgentFlushTimerRef.current);
            flushLogs();
        } else if (VIOLATION_TYPES.has(eventType)) {
            // Otherwise if violation event, flush quickly (1s debounce to batch rapid events)
            if (urgentFlushTimerRef.current) clearTimeout(urgentFlushTimerRef.current);
            urgentFlushTimerRef.current = setTimeout(() => {
                flushLogs();
            }, 1000);
        }
    }, [flushLogs]);

    useEffect(() => {
        if (!enabled || !examId) return;

        // Regular flush every 10 seconds for non-urgent events
        flushTimerRef.current = setInterval(flushLogs, 10000);

        // --- Visibility Change (Tab Switch / App Switch) ---
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsTabHidden(true);
                logEvent('tab_switch', isMobile ? 'App switched / hidden' : 'Tab hidden');
            } else {
                setIsTabHidden(false);
                logEvent('focus', isMobile ? 'App resumed' : 'Tab visible again');
            }
        };

        // --- Window Blur ---
        const handleBlur = () => {
            logEvent('blur', 'Window lost focus');
        };

        // --- Fullscreen Violation (Desktop Only) ---
        const handleFullscreenViolation = () => {
            const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
            if (!isMobile && !isFS) {
                logEvent('fullscreen_exit', 'Exited fullscreen mode');
                if (onSuspendRef.current) {
                    onSuspendRef.current();
                }
            }
        };

        // --- Mobile Split Screen Detection ---
        let splitScreenDebounceTimer = null;
        const checkMobileSplitScreen = () => {
            if (!isMobile) return;
            const isLandscape = window.innerWidth > window.innerHeight;
            const sWidth = window.screen.width || 0;
            const sHeight = window.screen.height || 0;
            const sAvailWidth = window.screen.availWidth || 0;
            let expectedWidth = sAvailWidth || sWidth;
            if (sWidth && sHeight) {
                expectedWidth = isLandscape ? Math.max(sWidth, sHeight) : Math.min(sWidth, sHeight);
            }
            if (expectedWidth > 0 && window.innerWidth < expectedWidth * 0.6) {
                logEvent('split_screen', `Split screen detected: ${window.innerWidth}px (screen: ${expectedWidth}px)`);
                if (onSuspendRef.current) {
                    onSuspendRef.current();
                }
            }
        };

        const handleResize = () => {
            if (isMobile) {
                if (splitScreenDebounceTimer) clearTimeout(splitScreenDebounceTimer);
                splitScreenDebounceTimer = setTimeout(checkMobileSplitScreen, 400);
            }
        };

        // --- Copy/Cut/Paste ---
        const handleCopy = (e) => {
            e.preventDefault();
            logEvent('copy', 'Attempted copy');
        };

        const handleCut = (e) => {
            e.preventDefault();
            logEvent('cut', 'Attempted cut');
        };

        const handlePaste = (e) => {
            e.preventDefault();
            logEvent('paste', 'Attempted paste');
        };

        // --- Right Click ---
        const handleContextMenu = (e) => {
            e.preventDefault();
            logEvent('right_click', 'Attempted right click');
        };

        // --- Forbidden Keys ---
        const handleKeyDown = (e) => {
            for (const fk of FORBIDDEN_KEYS) {
                const ctrlMatch = fk.ctrl ? (e.ctrlKey || e.metaKey) : true;
                const shiftMatch = fk.shift ? e.shiftKey : true;

                if (e.key === fk.key && ctrlMatch && shiftMatch) {
                    e.preventDefault();
                    e.stopPropagation();

                    if (e.key === 'PrintScreen') {
                        logEvent('print_screen', 'PrintScreen pressed');
                    } else if (e.key === 'F12') {
                        logEvent('devtools', 'F12 pressed');
                    } else {
                        logEvent('forbidden_key', `${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`);
                    }
                    return;
                }
            }
        };

        // Attach listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('cut', handleCut);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown, true);

        if (!isMobile) {
            document.addEventListener('fullscreenchange', handleFullscreenViolation);
            document.addEventListener('webkitfullscreenchange', handleFullscreenViolation);
        } else {
            window.addEventListener('resize', handleResize);
            window.addEventListener('orientationchange', handleResize);
            splitScreenDebounceTimer = setTimeout(checkMobileSplitScreen, 1200);
        }

        return () => {
            // Cleanup
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown, true);

            if (!isMobile) {
                document.removeEventListener('fullscreenchange', handleFullscreenViolation);
                document.removeEventListener('webkitfullscreenchange', handleFullscreenViolation);
            } else {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('orientationchange', handleResize);
                if (splitScreenDebounceTimer) clearTimeout(splitScreenDebounceTimer);
            }

            if (flushTimerRef.current) clearInterval(flushTimerRef.current);
            if (urgentFlushTimerRef.current) clearTimeout(urgentFlushTimerRef.current);

            // Flush remaining logs
            flushLogs();
        };
    }, [enabled, examId, isMobile, logEvent, flushLogs]);

    return {
        cheatCount,
        isTabHidden,
        isFullscreen,
        isMobile,
        warnings,
        resetCheatStatus,
    };
};

export default useAntiCheat;
