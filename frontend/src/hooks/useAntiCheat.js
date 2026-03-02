import { useEffect, useRef, useState } from 'react';
import api from '../config/api';

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

const useAntiCheat = (examId, enabled = true, onSuspend) => {
    const [cheatCount, setCheatCount] = useState(0);
    const [isTabHidden, setIsTabHidden] = useState(false);
    const [warnings, setWarnings] = useState([]);
    const logQueueRef = useRef([]);
    const flushTimerRef = useRef(null);

    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    const addWarning = (eventType, detail) => {
        const warning = {
            eventType,
            detail,
            timestamp: new Date().toISOString(),
        };
        setWarnings(prev => [...prev.slice(-19), warning]); // Keep last 20
        setCheatCount(prev => prev + 1);
    };

    // Queue log and flush periodically
    const logEvent = (eventType, detail = '') => {
        logQueueRef.current.push({ eventType, detail });
        addWarning(eventType, detail);
    };

    const flushLogs = async () => {
        if (logQueueRef.current.length === 0) return;

        const events = [...logQueueRef.current];
        logQueueRef.current = [];

        try {
            // Send events one by one (could batch, but keeping it simple)
            for (const event of events) {
                const { data } = await api.post(
                    `/exam-sessions/${examId}/cheat-log`,
                    event,
                    getConfig()
                );

                if (data.suspendStatus === 'suspended' && onSuspend) {
                    onSuspend();
                }
            }
        } catch (err) {
            // If network fails, put events back in queue
            logQueueRef.current = [...events, ...logQueueRef.current];
        }
    };

    useEffect(() => {
        if (!enabled || !examId) return;

        // Flush logs every 3 seconds
        flushTimerRef.current = setInterval(flushLogs, 3000);

        // --- Visibility Change (Tab Switch) ---
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsTabHidden(true);
                logEvent('tab_switch', 'Tab hidden');
            } else {
                setIsTabHidden(false);
                logEvent('focus', 'Tab visible again');
            }
        };

        // --- Window Blur/Focus ---
        const handleBlur = () => {
            logEvent('blur', 'Window lost focus');
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

        return () => {
            // Cleanup
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown, true);

            if (flushTimerRef.current) clearInterval(flushTimerRef.current);

            // Flush remaining logs
            flushLogs();
        };
    }, [enabled, examId]);

    return {
        cheatCount,
        isTabHidden,
        warnings,
    };
};

export default useAntiCheat;
