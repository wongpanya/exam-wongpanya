import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom Hook: useMascotBehavior
 * Manages the situational behaviors, countdown alerts, stuck detection,
 * speech bubble messages, and sleep/hide states for Pixel Mascot.
 * STRICTLY NO EMOJIS.
 */
export const useMascotBehavior = ({
    timeLeft,
    durationMin,
    currentPage,
    currentQuestionId,
    totalQuestions,
    answeredCount,
    submitted,
    isFlagged,
    onToggleFlag,
    onNextQuestion,
}) => {
    // Basic interaction states
    const [mascotState, setMascotState] = useState('idle'); // 'idle' | 'walk' | 'talk' | 'shocked' | 'sleep' | 'celebrate' | 'thinking'
    const [speech, setSpeech] = useState(null); // { text, actions?: Array<{ label, onClick }> }
    const [isSleeping, setIsSleeping] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [walkFrame, setWalkFrame] = useState(0);

    // Track triggered milestones to prevent repetitive popups
    const hasWelcomedRef = useRef(false);
    const hasWarned10mRef = useRef(false);
    const hasCelebratedRef = useRef(false);
    const speechTimeoutRef = useRef(null);
    const questionStayTimeRef = useRef(Date.now());
    const hasWarnedStuckForPageRef = useRef({});

    // Helper: format seconds to text
    const formatRemainingText = useCallback((sec) => {
        if (sec === null || sec === undefined) return 'ไม่ทราบเวลา';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        if (m > 0 && s > 0) return `${m} นาที ${s} วินาที`;
        if (m > 0) return `${m} นาที`;
        return `${s} วินาที`;
    }, []);

    // Set speech with optional auto dismiss
    const showSpeech = useCallback((text, actions = null, durationMs = 8000) => {
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        setSpeech({ text, actions });

        if (durationMs > 0) {
            speechTimeoutRef.current = setTimeout(() => {
                setSpeech(null);
            }, durationMs);
        }
    }, []);

    const dismissSpeech = useCallback(() => {
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        setSpeech(null);
    }, []);

    // Toggle sleep mode
    const toggleSleep = useCallback(() => {
        setIsSleeping(prev => {
            const next = !prev;
            if (next) {
                setMascotState('sleep');
                dismissSpeech();
            } else {
                setMascotState('idle');
                showSpeech('ตื่นแล้ว พร้อมช่วยดูข้อสอบต่อแล้ว!', null, 3000);
            }
            return next;
        });
    }, [dismissSpeech, showSpeech]);

    // Toggle hide mode
    const toggleHide = useCallback(() => {
        setIsHidden(prev => {
            const next = !prev;
            if (next) {
                dismissSpeech();
            } else {
                showSpeech('กลับมาแล้ว มีอะไรให้ช่วยไหม?', null, 3000);
            }
            return next;
        });
    }, [dismissSpeech, showSpeech]);

    // Trigger time check when user clicks mascot
    const askTime = useCallback(() => {
        if (isSleeping) {
            setIsSleeping(false);
        }
        if (timeLeft === null) {
            showSpeech('กำลังโหลดข้อมูลเวลาสอบอยู่...', null, 3000);
            return;
        }
        const timeText = formatRemainingText(timeLeft);
        showSpeech(`ตอนนี้เหลือเวลาอีก ${timeText} ค่อยๆ คิด ไม่ต้องรีบนะ!`, null, 5000);
    }, [isSleeping, timeLeft, formatRemainingText, showSpeech]);

    // 1. Initial Greeting when exam starts
    useEffect(() => {
        if (timeLeft !== null && durationMin && !hasWelcomedRef.current && !submitted) {
            hasWelcomedRef.current = true;
            const timeText = formatRemainingText(timeLeft);
            
            // Mascot greets and takes over the timer
            setTimeout(() => {
                setMascotState('talk');
                showSpeech(
                    `พร้อมไหม? การสอบนี้มีเวลา ${timeText} ฉันจะคอยช่วยดูแลเวลาให้เอง สู้ๆ นะ!`,
                    null,
                    8000
                );
                setTimeout(() => {
                    setMascotState(prev => prev === 'talk' ? 'idle' : prev);
                }, 3000);
            }, 1200);
        }
    }, [timeLeft, durationMin, submitted, formatRemainingText, showSpeech, dismissSpeech]);

    // 2. Critical Rule: Low time warning (< 10 minutes)
    // "แต่ตอนหลับหรือซ่อน ให้ตื่นแจ้งเตือนหากจะหมดเวลา และให้นับถอยหลัง"
    useEffect(() => {
        if (timeLeft !== null && timeLeft <= 600 && timeLeft > 0 && !hasWarned10mRef.current && !submitted) {
            hasWarned10mRef.current = true;

            // Auto wake up and unhide!
            setIsSleeping(false);
            setIsHidden(false);

            setMascotState('shocked');
            showSpeech(
                'เหลือเวลา 10 นาทีสุดท้ายแล้วนะ! ตรวจทานข้อที่ยังไม่ได้ตอบหรือปักหมุดไว้ดูนะ',
                null,
                10000
            );

            // Revert back from shocked expression after 6 seconds
            const t = setTimeout(() => {
                setMascotState(prev => prev === 'shocked' ? 'idle' : prev);
            }, 6000);

            return () => clearTimeout(t);
        }
    }, [timeLeft, submitted, showSpeech]);

    // 3. Question inactivity detection (stuck on question > 120s)
    useEffect(() => {
        questionStayTimeRef.current = Date.now();
        // Reset speech if it was a stuck alert from previous question
        if (speech?.actions && !hasWelcomedRef.current) {
            dismissSpeech();
        }

        const interval = setInterval(() => {
            if (submitted || isSleeping || isHidden) return;

            const secondsOnQuestion = (Date.now() - questionStayTimeRef.current) / 1000;
            if (secondsOnQuestion >= 120 && !hasWarnedStuckForPageRef.current[currentPage]) {
                hasWarnedStuckForPageRef.current[currentPage] = true;
                setMascotState('thinking');

                const actions = [];
                if (onToggleFlag && !isFlagged) {
                    actions.push({
                        label: 'ปักหมุดข้อนี้ไว้ก่อน',
                        onClick: () => {
                            onToggleFlag();
                            dismissSpeech();
                            if (onNextQuestion) onNextQuestion();
                        }
                    });
                }
                if (onNextQuestion) {
                    actions.push({
                        label: 'ข้ามไปข้อถัดไป',
                        onClick: () => {
                            dismissSpeech();
                            onNextQuestion();
                        }
                    });
                }

                showSpeech(
                    'ข้อนี้คิดไม่ออกหรือเปล่า? ปักหมุดไว้ก่อนแล้วค่อยกลับมาทำใหม่ก็ได้นะ',
                    actions.length > 0 ? actions : null,
                    9000
                );

                setTimeout(() => {
                    setMascotState(prev => prev === 'thinking' ? 'idle' : prev);
                }, 4000);
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [currentPage, submitted, isSleeping, isHidden, isFlagged, onToggleFlag, onNextQuestion, showSpeech, dismissSpeech, speech]);

    // 4. Submission Celebration
    useEffect(() => {
        if (submitted && !hasCelebratedRef.current) {
            hasCelebratedRef.current = true;
            setIsSleeping(false);
            setIsHidden(false);
            setMascotState('celebrate');
            showSpeech(
                'ยินดีด้วย! ส่งข้อสอบเรียบร้อยแล้ว ทำเต็มที่แล้วพักผ่อนได้เลย',
                null,
                15000
            );
        }
    }, [submitted, showSpeech]);

    // 5. Mascot subtle animation loop (blinking / walking leg bob)
    useEffect(() => {
        if (isSleeping || isHidden) return;

        const interval = setInterval(() => {
            setWalkFrame(prev => (prev === 0 ? 1 : 0));
        }, 800);

        return () => clearInterval(interval);
    }, [isSleeping, isHidden]);

    // Random blink when idle
    useEffect(() => {
        if (isSleeping || isHidden || mascotState !== 'idle') return;

        const blinkInterval = setInterval(() => {
            if (Math.random() > 0.4) {
                setMascotState('blink');
                setTimeout(() => {
                    setMascotState(prev => prev === 'blink' ? 'idle' : prev);
                }, 200);
            }
        }, 4000);

        return () => clearInterval(blinkInterval);
    }, [isSleeping, isHidden, mascotState]);

    return {
        mascotState,
        setMascotState,
        speech,
        dismissSpeech,
        isSleeping,
        toggleSleep,
        isHidden,
        toggleHide,
        walkFrame,
        askTime,
        formatRemainingText,
    };
};

export default useMascotBehavior;
