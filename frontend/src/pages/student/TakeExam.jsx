import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { useDialog } from '../../components/DialogProvider';
import useAntiCheat from '../../hooks/useAntiCheat';
import { 
    Clock, 
    Send, 
    AlertTriangle, 
    CheckCircle, 
    Shield, 
    Save, 
    Lock, 
    Wifi, 
    WifiOff, 
    RefreshCw, 
    Bookmark, 
    Check, 
    X 
} from 'lucide-react';

const AUTO_SAVE_INTERVAL = 45000; // 45 seconds (optimized from 30s)
const DEBOUNCE_SAVE_MS = 2000;
const STATUS_CHECK_INTERVAL = 15000; // 15 seconds for suspension check (optimized from 5s)
const MAX_ESSAY_CHARS = 12000;
const hasAnswer = value => typeof value === 'string' && value.trim().length > 0;

const TakeExam = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useDialog();
    const [exam, setExam] = useState(null);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [suspended, setSuspended] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [result, setResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [lastSaved, setLastSaved] = useState(null);
    const [saving, setSaving] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentPage, setCurrentPage] = useState(1);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [flaggedQuestions, setFlaggedQuestions] = useState(() => {
        try {
            const saved = localStorage.getItem(`exam_flags_${examId}`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const questionsPerPage = 1;

    const timerRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const statusCheckTimerRef = useRef(null);
    const debounceSaveRef = useRef(null);
    const answersRef = useRef({});
    const questionsTopRef = useRef(null);

    const goToPage = useCallback((page) => {
        setCurrentPage(page);
        setTimeout(() => {
            questionsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 30);
    }, []);

    // Anti-cheat hook
    const { cheatCount, isTabHidden, warnings, resetCheatStatus } = useAntiCheat(examId, !submitted && !suspended, () => setSuspended(true));

    // localStorage key for backup
    const storageKey = `exam_answers_${examId}`;

    // Save answers to localStorage
    const saveToLocalStorage = useCallback((ans) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                answers: ans,
                savedAt: new Date().toISOString(),
            }));
        } catch {
            // ignore
        }
    }, [storageKey]);

    // Restore answers from localStorage
    const restoreFromLocalStorage = useCallback(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.answers || {};
            }
        } catch {
            // ignore
        }
        return null;
    }, [storageKey]);

    // Auto-save to server
    const autoSaveToServer = useCallback(async () => {
        const currentAnswers = answersRef.current;
        if (!currentAnswers || Object.keys(currentAnswers).length === 0) return;

        setSaving(true);
        try {
            const answerArray = Object.entries(currentAnswers).map(([questionId, selectedAnswer]) => ({
                questionId,
                selectedAnswer,
            }));

            // Auto-save now returns status
            const { data } = await api.post(
                `/exam-sessions/${examId}/auto-save`,
                { answers: answerArray }
            );

            setLastSaved(new Date());

            if (data.status === 'suspended') setSuspended(true);
            if (data.status === 'submitted') {
                setSubmitted(true);
                // Force reload or fetch result if needed, but submitted state usually handles UI
            }
        } catch (err) {
            console.warn('Auto-save failed:', err.message);
        } finally {
            setSaving(false);
        }
    }, [examId]);



    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const fetchAttempt = async () => {
            try {
                const { data } = await api.get(`/exam-sessions/${examId}/attempt`);
                setExam(data.exam);
                setSessionInfo(data.session);

                // Initialize answers from existing attempt
                const existingAnswers = {};
                data.attempt.answers?.forEach(a => {
                    if (a.selectedAnswer) {
                        existingAnswers[a.questionId] = a.selectedAnswer;
                    }
                });

                // Try restore from localStorage if server answers are empty
                const localAnswers = restoreFromLocalStorage();
                const hasServerAnswers = Object.keys(existingAnswers).length > 0;
                const hasLocalAnswers = localAnswers && Object.keys(localAnswers).length > 0;

                if (hasServerAnswers) {
                    setAnswers(existingAnswers);
                    answersRef.current = existingAnswers;
                } else if (hasLocalAnswers) {
                    setAnswers(localAnswers);
                    answersRef.current = localAnswers;
                }

                if (data.attempt.status === 'submitted') {
                    setSubmitted(true);
                    setResult({
                        score: data.attempt.score,
                        totalPoints: data.attempt.totalPoints,
                        gradingStatus: data.attempt.gradingStatus,
                    });
                    localStorage.removeItem(storageKey);
                } else if (data.attempt.status === 'suspended') {
                    setSuspended(true);
                    // Calculate remaining time anyway so it resumes correctly
                    const startTime = new Date(data.session.startedAt).getTime();
                    const durationMs = data.exam.durationMin * 60 * 1000;
                    const endTime = startTime + durationMs;
                    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                    setTimeLeft(remaining);
                } else {
                    const startTime = new Date(data.session.startedAt).getTime();
                    const durationMs = data.exam.durationMin * 60 * 1000;
                    const endTime = startTime + durationMs;
                    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                    setTimeLeft(remaining);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load exam');
            } finally {
                setLoading(false);
            }
        };

        fetchAttempt();
    }, [examId]);

    // Timer countdown
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submitted || suspended) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmit(true); // force submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timeLeft, submitted, suspended]);

    // Auto-save interval
    useEffect(() => {
        if (submitted || suspended) return;

        autoSaveTimerRef.current = setInterval(() => {
            autoSaveToServer();
        }, AUTO_SAVE_INTERVAL);

        return () => {
            if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
        };
    }, [submitted, suspended, autoSaveToServer]);



    // Save to localStorage on beforeunload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (!submitted && !suspended) {
                saveToLocalStorage(answersRef.current);
                autoSaveToServer();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [submitted, suspended, saveToLocalStorage, autoSaveToServer]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const selectAnswer = (questionId, value, questionType) => {
        if (suspended) return;

        setAnswers(prev => {
            const updated = { ...prev };
            if (questionType === 'checkbox') {
                const selected = new Set(String(prev[questionId] || '').split(',').filter(Boolean));
                if (selected.has(value)) selected.delete(value);
                else selected.add(value);

                if (selected.size > 0) updated[questionId] = [...selected].sort().join(',');
                else delete updated[questionId];
            } else {
                updated[questionId] = value;
            }
            answersRef.current = updated;
            saveToLocalStorage(updated);

            if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
            debounceSaveRef.current = setTimeout(() => {
                autoSaveToServer();
            }, DEBOUNCE_SAVE_MS);

            return updated;
        });
    };

    const toggleFlag = useCallback((questionId) => {
        setFlaggedQuestions(prev => {
            const next = { ...prev, [questionId]: !prev[questionId] };
            if (!next[questionId]) delete next[questionId];
            try {
                localStorage.setItem(`exam_flags_${examId}`, JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });
    }, [examId]);

    const doSubmit = useCallback(async () => {
        if (submitting || submitted || suspended) return;

        if (!isOnline) {
            await showAlert({ 
                title: 'ไม่มีการเชื่อมต่อ', 
                message: 'คุณกำลังออฟไลน์ ระบบได้บันทึกคำตอบไว้ในเครื่องแล้ว\nกรุณารอให้อินเทอร์เน็ตกลับมาเชื่อมต่อแล้วกดส่งอีกครั้ง', 
                variant: 'warning' 
            });
            return;
        }

        setSubmitting(true);
        setShowSubmitModal(false);

        try {
            const answerArray = Object.entries(answersRef.current).map(([questionId, selectedAnswer]) => ({
                questionId,
                selectedAnswer,
            }));

            const { data } = await api.post(
                `/exam-sessions/${examId}/submit`,
                { answers: answerArray }
            );

            setSubmitted(true);
            setResult({
                score: data.score,
                totalPoints: data.totalPoints,
                percentage: data.percentage,
                gradingStatus: data.gradingStatus,
                needsHumanReview: data.needsHumanReview,
            });

            localStorage.removeItem(storageKey);
            localStorage.removeItem(`exam_flags_${examId}`);
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit exam');
        } finally {
            setSubmitting(false);
        }
    }, [examId, isOnline, storageKey, showAlert, submitting, submitted, suspended]);

    const handleSubmit = useCallback((force = false) => {
        if (submitting || submitted || suspended) return;

        if (force) {
            doSubmit();
            return;
        }

        setShowSubmitModal(true);
    }, [submitting, submitted, suspended, doSubmit]);

    // Check exam status (polled + manual)
    const checkStatus = useCallback(async () => {
        try {
            const { data } = await api.get(`/exam-sessions/${examId}/my-status`);
            
            if (data.sessionStatus === 'ended' || data.status === 'submitted') {
                if (timerRef.current) clearInterval(timerRef.current);
                if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
                if (statusCheckTimerRef.current) clearInterval(statusCheckTimerRef.current);
                window.location.reload();
                return;
            }

            if (data.status === 'suspended') setSuspended(true);
            else if (data.status === 'in-progress' || data.status === 'in_progress') {
                if (suspended) {
                    resetCheatStatus();
                    setSuspended(false);
                }
            }
        } catch {
            // Silently ignore — next poll will retry
        }
    }, [examId, suspended, resetCheatStatus]);

    const handleManualStatusCheck = async () => {
        setCheckingStatus(true);
        await checkStatus();
        setCheckingStatus(false);
    };

    // Lightweight HTTP polling for suspend/session-end status (replaces Socket.io to save RAM)
    useEffect(() => {
        if (!sessionInfo || submitted) return;

        statusCheckTimerRef.current = setInterval(checkStatus, STATUS_CHECK_INTERVAL);

        return () => {
            if (statusCheckTimerRef.current) clearInterval(statusCheckTimerRef.current);
        };
    }, [sessionInfo, submitted, checkStatus]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error && !exam) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
                <p className="text-red-600">{error}</p>
                <button onClick={() => navigate('/student')} className="mt-4 text-indigo-600 hover:underline">
                    ← กลับหน้าหลัก
                </button>
            </div>
        );
    }

    // Result screen
    if (submitted && result) {
        const awaitingGrade = ['pending', 'processing'].includes(result.gradingStatus);
        const awaitingReview = result.gradingStatus === 'needs-review';
        const gradingFailed = result.gradingStatus === 'failed';
        const showFinalScore = !awaitingGrade && !awaitingReview && !gradingFailed && result.score !== null;
        return (
            <div className="max-w-lg mx-auto text-center py-12">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">ส่งข้อสอบสำเร็จ!</h1>
                    <p className="text-gray-500 mb-6">{exam.title}</p>

                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                        {awaitingGrade && (
                            <div>
                                <Clock className="mx-auto text-indigo-500 mb-2" size={32} />
                                <p className="font-semibold text-gray-900">กำลังตรวจคำตอบอัตนัย</p>
                                <p className="text-sm text-gray-500 mt-1">ระบบรับคำตอบแล้ว คะแนนจะแสดงเมื่อการตรวจเสร็จ</p>
                            </div>
                        )}
                        {awaitingReview && (
                            <div>
                                <Shield className="mx-auto text-amber-500 mb-2" size={32} />
                                <p className="font-semibold text-gray-900">รออาจารย์ตรวจยืนยัน</p>
                                <p className="text-sm text-gray-500 mt-1">ระบบจะยังไม่แสดงคะแนนจนกว่าจะตรวจยืนยันเรียบร้อย</p>
                            </div>
                        )}
                        {gradingFailed && (
                            <div>
                                <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                                <p className="font-semibold text-gray-900">รออาจารย์ดำเนินการตรวจ</p>
                                <p className="text-sm text-gray-500 mt-1">การตรวจอัตโนมัติไม่สำเร็จ แต่คำตอบถูกบันทึกแล้ว</p>
                            </div>
                        )}
                        {showFinalScore && (
                            <>
                        <p className="text-4xl font-bold text-indigo-600">
                            {result.score} / {result.totalPoints}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">คะแนนที่ได้</p>
                        {result.percentage !== undefined && (
                            <div className="mt-3">
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all ${result.percentage >= 60 ? 'bg-green-50' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${result.percentage}%` }}
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{result.percentage}%</p>
                            </div>
                        )}
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/student')}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
                    >
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    const answeredCount = Object.values(answers).filter(hasAnswer).length;
    const totalQuestions = exam?.questions?.length || 0;
    const totalPages = Math.ceil(totalQuestions / questionsPerPage);
    const currentQuestions = exam?.questions?.slice(
        (currentPage - 1) * questionsPerPage,
        currentPage * questionsPerPage
    ) || [];

    const unansweredQuestions = (exam?.questions || [])
        .map((q, index) => ({
            questionId: q.questionId,
            index,
            page: Math.ceil((index + 1) / questionsPerPage),
            isAnswered: hasAnswer(answers[q.questionId])
        }))
        .filter(item => !item.isAnswered);

    const flaggedCount = Object.keys(flaggedQuestions).filter(id => flaggedQuestions[id]).length;

    return (
        <div className="space-y-4 relative">
            {/* Suspended Overlay */}
            {suspended && (
                <div className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm animate-fade-in">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full animate-scale-up">
                        <Lock className="mx-auto text-red-500 mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">การสอบถูกระงับชั่วคราว</h2>
                        <p className="text-gray-600 mb-6">
                            กรุณาติดต่อผู้คุมสอบเพื่อดำเนินการต่อ<br />
                            หากผู้คุมสอบยืนยันว่าคุณสามารถดำเนินการสอบต่อได้ ให้กดปุ่ม "ลองใหม่" เพื่อรีเฟรชสถานะ<br/> 
                            หากคุณออกจากหน้าสอบหรือปิดแท็บนี้ การสอบจะถูกบันทึกและส่งอัตโนมัติ
                        </p>
                        <p className="text-gray-500 text-sm mb-4">
                            เหตุผลที่ถูกระงับ: {(() => {
                                if (warnings.length === 0) return 'ไม่ทราบ';
                                const lastWarning = warnings[warnings.length - 1];
                                const mapper = {
                                    'tab_switch': 'สลับแท็บ/ออกจากหน้าต่างสอบ',
                                    'blur': 'คลิกออกนอกหน้าต่างสอบ',
                                    'copy': 'คัดลอกข้อความ',
                                    'cut': 'ตัดข้อความ',
                                    'paste': 'วางข้อความ',
                                    'right_click': 'คลิกขวา',
                                    'print_screen': 'แคปหน้าจอ (Print Screen)',
                                    'devtools': 'เปิดหน้าต่างนักพัฒนา (DevTools)',
                                    'forbidden_key': 'กดคีย์ต้องห้าม',
                                };
                                return mapper[lastWarning.eventType] || lastWarning.detail || lastWarning.eventType || 'ไม่ทราบ';
                            })()}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-indigo-600 bg-indigo-50 py-2 px-4 rounded-full text-sm font-medium animate-pulse">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                            กำลังรอการปลดล็อก...
                        </div>
                        <button
                            onClick={handleManualStatusCheck}
                            disabled={checkingStatus}
                            className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                            <RefreshCw size={18} className={checkingStatus ? 'animate-spin' : ''} />
                            {checkingStatus ? 'กำลังตรวจสอบ...' : 'ลองใหม่'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tab hidden overlay (Soft, professional warning) */}
            {isTabHidden && !suspended && (
                <div className="fixed inset-0 z-40 bg-gray-900/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm text-center border border-gray-100 animate-scale-up">
                        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">กรุณากลับมาที่หน้าต่างสอบ</h2>
                        <p className="text-gray-600 text-sm mb-4">
                            ระบบตรวจพบว่าหน้าต่างสอบสูญเสียการโฟกัส ข้อมูลนี้ถูกบันทึกในรายงานคุมสอบ
                        </p>
                        <p className="text-xs text-indigo-600 font-medium bg-indigo-50 py-2 px-3 rounded-lg">
                            คลิกที่หน้าต่างนี้เพื่อทำข้อสอบต่อ
                        </p>
                    </div>
                </div>
            )}

            {/* Sticky Timer Header */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 shadow-2xs">
                <div className="flex items-center justify-between max-w-5xl mx-auto gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="font-bold text-gray-900 text-sm sm:text-base truncate">{exam.title}</h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span>ข้อ {currentPage} จาก {totalQuestions}</span>
                            <span>•</span>
                            <span>ตอบแล้ว {answeredCount}/{totalQuestions} ข้อ</span>
                            {saving && (
                                <span className="flex items-center gap-1 text-indigo-600 font-medium ml-1">
                                    <Save size={11} className="animate-pulse" /> กำลังบันทึก...
                                </span>
                            )}
                            {!saving && lastSaved && (
                                <span className="hidden xs:inline text-emerald-600 font-medium ml-1">
                                    ✓ บันทึกแล้ว
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isOnline ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                <span className="hidden sm:inline">ออนไลน์</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-medium animate-pulse">
                                <WifiOff size={12} />
                                <span>ออฟไลน์</span>
                            </div>
                        )}

                        {cheatCount > 0 && (
                            <div
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-600 bg-gray-100"
                                title={`บันทึกการออกนอกหน้าต่างสอบ ${cheatCount} ครั้ง`}
                            >
                                <Shield size={12} className="text-gray-500" />
                                <span className="hidden sm:inline">แจ้งเตือน</span>
                                <span>{cheatCount}</span>
                            </div>
                        )}

                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm sm:text-base ${
                            timeLeft !== null && timeLeft <= 60
                                ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                                : timeLeft !== null && timeLeft <= 300
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                            <Clock size={16} />
                            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Question Navigator */}
            <div className={`bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-2xs ${suspended ? 'opacity-50 pointer-events-none filter blur-sm' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">แผนผังข้อสอบ</span>
                        <span className="text-xs text-gray-500">
                            ({answeredCount}/{totalQuestions} ตอบแล้ว)
                        </span>
                        {flaggedCount > 0 && (
                            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                <Bookmark size={11} className="fill-amber-500 text-amber-500" />
                                ปักหมุด {flaggedCount}
                            </span>
                        )}
                    </div>

                    <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> กำลังทำ</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-100 border border-indigo-200 inline-block" /> ตอบแล้ว</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-white border border-gray-200 inline-block" /> ยังไม่ตอบ</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {exam.questions.map((q, index) => {
                        const pageNum = Math.ceil((index + 1) / questionsPerPage);
                        const isAnswered = hasAnswer(answers[q.questionId]);
                        const isFlagged = Boolean(flaggedQuestions[q.questionId]);
                        const isCurrent = pageNum === currentPage;
                        return (
                            <button
                                key={q.questionId}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => goToPage(pageNum)}
                                className={`w-9 h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer relative ${
                                    isCurrent
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : isAnswered
                                            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                {index + 1}
                                {isFlagged && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Questions Card */}
            <div ref={questionsTopRef} className={`space-y-4 ${suspended ? 'opacity-50 pointer-events-none filter blur-sm' : ''}`}>
                {currentQuestions.map((q, index) => {
                    const globalIndex = (currentPage - 1) * questionsPerPage + index;
                    const isFlagged = Boolean(flaggedQuestions[q.questionId]);
                    return (
                        <div key={q.questionId} className="bg-white rounded-xl shadow-2xs p-5 sm:p-7 border border-gray-200">
                            {/* Question Header */}
                            <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                        ข้อที่ {globalIndex + 1} จาก {totalQuestions}
                                    </span>
                                    <span className="text-xs text-gray-400">({q.points} คะแนน)</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggleFlag(q.questionId)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                                        isFlagged
                                            ? 'bg-amber-50 text-amber-700 border border-amber-300'
                                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                                    }`}
                                    title={isFlagged ? 'ยกเลิกการปักหมุด' : 'ปักหมุดข้อนี้ไว้ทบทวน'}
                                >
                                    <Bookmark size={13} className={isFlagged ? 'fill-amber-500 text-amber-500' : 'text-gray-400'} />
                                    <span>{isFlagged ? 'ปักหมุดแล้ว' : 'ปักหมุดทบทวน'}</span>
                                </button>
                            </div>

                            {/* Question Prompt */}
                            <div className="mb-5">
                                <div
                                    className="text-base sm:text-lg text-gray-900 font-medium leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: q.prompt }}
                                />
                            </div>

                            {q.type === 'text' ? (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor={`essay-${q.questionId}`} className="block text-sm font-medium text-gray-700">
                                            คำตอบของคุณ
                                        </label>
                                        <span className="text-xs text-gray-400 font-medium">
                                            {(() => {
                                                const text = answers[q.questionId] || '';
                                                const words = text.trim() ? text.trim().split(/\s+/).length : 0;
                                                return `${words.toLocaleString()} คำ | ${text.length.toLocaleString()} / ${MAX_ESSAY_CHARS.toLocaleString()} ตัวอักษร`;
                                            })()}
                                        </span>
                                    </div>
                                    <textarea
                                        id={`essay-${q.questionId}`}
                                        value={answers[q.questionId] || ''}
                                        onChange={(event) => selectAnswer(q.questionId, event.target.value, q.type)}
                                        maxLength={MAX_ESSAY_CHARS}
                                        rows={8}
                                        disabled={suspended}
                                        placeholder="พิมพ์คำตอบอัตนัยที่นี่..."
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-y text-sm leading-6 disabled:bg-gray-100 font-sans"
                                    />
                                </div>
                            ) : (
                                <>
                                    {q.type === 'checkbox' && (
                                        <div className="mb-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            <CheckCircle size={13} className="text-blue-500 shrink-0" />
                                            <span>ข้อสอบประเภทเลือกได้หลายคำตอบ</span>
                                        </div>
                                    )}
                                    <div className="space-y-2.5">
                                        {q.choices.map((choice, choiceIndex) => {
                                            const isSelected = q.type === 'checkbox'
                                                ? String(answers[q.questionId] || '').split(',').includes(choice.value)
                                                : answers[q.questionId] === choice.value;
                                            return (
                                                <button
                                                    key={choice.value}
                                                    type="button"
                                                    onClick={() => selectAnswer(q.questionId, choice.value, q.type)}
                                                    disabled={suspended}
                                                    className={`w-full flex items-center gap-3.5 px-4 sm:px-5 py-3.5 rounded-xl border transition-all text-left text-sm sm:text-base cursor-pointer ${
                                                        isSelected
                                                            ? 'border-indigo-600 bg-indigo-50/40 text-gray-900 ring-1 ring-indigo-600 font-medium shadow-2xs'
                                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/60 text-gray-700 bg-white'
                                                    }`}
                                                >
                                                    <div className={`w-7 h-7 ${q.type === 'checkbox' ? 'rounded-md' : 'rounded-full'} flex items-center justify-center shrink-0 font-semibold text-xs transition-all ${
                                                        isSelected
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'border border-gray-300 text-gray-500 bg-gray-50'
                                                    }`}>
                                                        {q.type === 'checkbox' && isSelected ? <Check size={14} /> : String.fromCharCode(65 + choiceIndex)}
                                                    </div>
                                                    <span className="flex-1 leading-relaxed">{choice.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Unified Bottom Action Bar */}
            <div className={`sticky bottom-0 bg-white/95 backdrop-blur-xs -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 border-t border-gray-200 shadow-sm flex items-center justify-between gap-3 ${suspended ? 'opacity-50 pointer-events-none' : ''}`}>
                <button
                    type="button"
                    onClick={() => goToPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3.5 sm:px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                >
                    ← ข้อก่อนหน้า
                </button>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">ข้อ {currentPage} / {totalPages}</span>
                    <span className="text-gray-300">•</span>
                    <span>ตอบแล้ว {answeredCount}/{totalQuestions}</span>
                    {flaggedCount > 0 && (
                        <>
                            <span className="text-gray-300 hidden sm:inline">•</span>
                            <span className="text-amber-600 hidden sm:inline font-medium">ปักหมุด {flaggedCount}</span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {currentPage < totalPages ? (
                        <button
                            type="button"
                            onClick={() => goToPage(currentPage + 1)}
                            className="px-4 sm:px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition cursor-pointer"
                        >
                            ข้อถัดไป →
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={submitting || suspended}
                        className={`px-4 sm:px-5 py-2 text-sm font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                            currentPage === totalPages
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200'
                        }`}
                    >
                        <Send size={14} />
                        <span>ส่งข้อสอบ</span>
                    </button>
                </div>
            </div>

            {/* Submit Confirmation & Missing Questions Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-200 animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Send size={18} className="text-indigo-600" />
                                    ยืนยันการส่งข้อสอบ
                                </h3>
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Status overview in a single clean row */}
                            <div className="grid grid-cols-3 gap-2 my-4 bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                                <div>
                                    <p className="text-xl font-bold text-gray-900">{answeredCount}</p>
                                    <p className="text-xs text-gray-500">ตอบแล้ว</p>
                                </div>
                                <div>
                                    <p className={`text-xl font-bold ${
                                        totalQuestions - answeredCount > 0 ? 'text-amber-600' : 'text-gray-900'
                                    }`}>
                                        {totalQuestions - answeredCount}
                                    </p>
                                    <p className="text-xs text-gray-500">ยังไม่ตอบ</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-900">{flaggedCount}</p>
                                    <p className="text-xs text-gray-500">ปักหมุด</p>
                                </div>
                            </div>

                            {/* Conditional note */}
                            {totalQuestions - answeredCount > 0 ? (
                                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 mb-5">
                                    <h4 className="text-xs font-semibold text-amber-900 flex items-center gap-1.5 mb-1.5">
                                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                                        ยังมีข้อที่ยังไม่ได้ตอบ {totalQuestions - answeredCount} ข้อ:
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                        {unansweredQuestions.map(item => (
                                            <button
                                                key={item.questionId}
                                                type="button"
                                                onClick={() => {
                                                    setShowSubmitModal(false);
                                                    goToPage(item.page);
                                                }}
                                                className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded text-xs font-medium transition cursor-pointer"
                                            >
                                                ข้อ {item.index + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 mb-5 flex items-center gap-2.5">
                                    <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                                    <p className="text-xs text-emerald-800">
                                        ตอบครบทุกข้อแล้ว ({totalQuestions} ข้อ) พร้อมส่งข้อสอบ
                                    </p>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                                >
                                    กลับไปตรวจทาน
                                </button>
                                <button
                                    type="button"
                                    onClick={doSubmit}
                                    disabled={submitting}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition cursor-pointer"
                                >
                                    {submitting ? 'กำลังส่ง...' : 'ยืนยันส่งข้อสอบ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeExam;
