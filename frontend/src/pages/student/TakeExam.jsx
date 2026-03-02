import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { useDialog } from '../../components/DialogProvider';
import useAntiCheat from '../../hooks/useAntiCheat';
import { Clock, Send, AlertTriangle, CheckCircle, Shield, Save, Lock, Wifi, WifiOff } from 'lucide-react';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const DEBOUNCE_SAVE_MS = 2000;
const STATUS_CHECK_INTERVAL = 5000; // 5 seconds for suspension check

const TakeExam = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useDialog();
    const [exam, setExam] = useState(null);
    const [attempt, setAttempt] = useState(null);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [suspended, setSuspended] = useState(false);
    const [result, setResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [lastSaved, setLastSaved] = useState(null);
    const [saving, setSaving] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentPage, setCurrentPage] = useState(1);
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
    const { cheatCount, isTabHidden, warnings } = useAntiCheat(examId, !submitted && !suspended, () => setSuspended(true));

    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    // localStorage key for backup
    const storageKey = `exam_answers_${examId}`;

    // Save answers to localStorage
    const saveToLocalStorage = useCallback((ans) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                answers: ans,
                savedAt: new Date().toISOString(),
            }));
        } catch (e) {
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
        } catch (e) {
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
                { answers: answerArray },
                getConfig()
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

    // Status Check Polling
    const checkStatus = useCallback(async () => {
        if (!isOnline) return;
        try {
            const { data } = await api.get(`/exam-sessions/${examId}/my-status`, getConfig());
            if (data.status === 'suspended') {
                setSuspended(true);
            } else if (data.status === 'in-progress' && suspended) {
                setSuspended(false); // Unsuspend if status changed back
            } else if (data.status === 'submitted' && !submitted) {
                setSubmitted(true);
                // If externally submitted (e.g. by time limit on server), we should fetch result
                // For now just show submitted state, result might be missing but we can fetch it
            }
        } catch (err) {
            console.error('Status check failed', err);
        }
    }, [examId, suspended, submitted, isOnline]);

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
                const { data } = await api.get(`/exam-sessions/${examId}/attempt`, getConfig());
                setExam(data.exam);
                setAttempt(data.attempt);
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

    // Status Check Interval
    useEffect(() => {
        if (submitted) return;

        statusCheckTimerRef.current = setInterval(() => {
            checkStatus();
        }, STATUS_CHECK_INTERVAL);

        return () => {
            if (statusCheckTimerRef.current) clearInterval(statusCheckTimerRef.current);
        };
    }, [submitted, checkStatus]);

    // Save to localStorage on beforeunload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
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

    const selectAnswer = (questionId, value) => {
        if (suspended) return;

        setAnswers(prev => {
            const updated = { ...prev, [questionId]: value };
            answersRef.current = updated;
            saveToLocalStorage(updated);

            if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
            debounceSaveRef.current = setTimeout(() => {
                autoSaveToServer();
            }, DEBOUNCE_SAVE_MS);

            return updated;
        });
    };

    const handleSubmit = useCallback(async (force = false) => {
        if (submitting || submitted || suspended) return;

        const answered = Object.keys(answersRef.current).length;
        const total = exam?.questions?.length || 0;

        // Block if not all answered (unless forced by timer)
        if (!force && answered < total) {
            await showAlert({ title: 'ยังตอบไม่ครบ', message: `กรุณาตอบให้ครบทุกข้อก่อนส่ง (ตอบแล้ว ${answered}/${total} ข้อ)`, variant: 'warning' });
            return;
        }

        if (!force && !await showConfirm({ title: 'ส่งข้อสอบ', message: 'คุณต้องการส่งข้อสอบใช่หรือไม่?', confirmText: 'ส่งข้อสอบ', cancelText: 'ยกเลิก', variant: 'warning' })) return;

        if (!isOnline) {
            await showAlert({ title: 'ไม่มีการเชื่อมต่อ', message: 'คุณกำลังออฟไลน์ ระบบได้บันทึกคำตอบไว้ในเครื่องแล้ว\nกรุณารอให้อินเทอร์เน็ตกลับมาเชื่อมต่อแล้วกดส่งอีกครั้ง', variant: 'warning' });
            return;
        }

        setSubmitting(true);

        try {
            const answerArray = Object.entries(answersRef.current).map(([questionId, selectedAnswer]) => ({
                questionId,
                selectedAnswer,
            }));

            const { data } = await api.post(
                `/exam-sessions/${examId}/submit`,
                { answers: answerArray },
                getConfig()
            );

            setSubmitted(true);
            setResult({
                score: data.score,
                totalPoints: data.totalPoints,
                percentage: data.percentage,
            });

            localStorage.removeItem(storageKey);
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit exam');
        } finally {
            setSubmitting(false);
        }
    }, [answers, exam, examId, submitting, submitted, suspended, showAlert, showConfirm]);

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
        return (
            <div className="max-w-lg mx-auto text-center py-12">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">ส่งข้อสอบสำเร็จ!</h1>
                    <p className="text-gray-500 mb-6">{exam.title}</p>

                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
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

    const answeredCount = Object.keys(answers).length;
    const totalQuestions = exam?.questions?.length || 0;
    const totalPages = Math.ceil(totalQuestions / questionsPerPage);
    const currentQuestions = exam?.questions?.slice(
        (currentPage - 1) * questionsPerPage,
        currentPage * questionsPerPage
    ) || [];

    return (
        <div className="space-y-4 relative">
            {/* Suspended Overlay */}
            {suspended && (
                <div className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
                        <Lock className="mx-auto text-red-500 mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">การสอบถูกระงับชั่วคราว</h2>
                        <p className="text-gray-600 mb-6">
                            กรุณาติดต่อผู้คุมสอบเพื่อดำเนินการต่อ<br />
                            ระบบจะตรวจสอบสถานะใหม่โดยอัตโนมัติ
                        </p>
                        <div className="flex items-center justify-center gap-2 text-indigo-600 bg-indigo-50 py-2 px-4 rounded-full text-sm font-medium animate-pulse">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                            กำลังรอการปลดล็อก...
                        </div>
                    </div>
                </div>
            )}

            {/* Tab hidden overlay */}
            {isTabHidden && !suspended && (
                <div className="fixed inset-0 z-40 bg-red-900/95 flex items-center justify-center">
                    <div className="text-center text-white p-8">
                        <AlertTriangle className="mx-auto mb-4" size={64} />
                        <h2 className="text-2xl font-bold mb-2">⚠️ กรุณากลับมาที่หน้าสอบ</h2>
                        <p className="text-red-200">การออกจากหน้าสอบถูกบันทึกแล้ว</p>
                        <p className="text-red-300 text-sm mt-2">เหตุการณ์นี้จะถูกรายงานให้ผู้คุมสอบทราบ</p>
                    </div>
                </div>
            )}

            {/* Sticky Timer Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 shadow-sm">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <div>
                        <h1 className="font-bold text-gray-900 text-sm sm:text-base">{exam.title}</h1>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{answeredCount}/{totalQuestions} ข้อ</span>
                            {saving && (
                                <span className="flex items-center gap-1 text-blue-500">
                                    <Save size={10} className="animate-pulse" /> กำลังบันทึก...
                                </span>
                            )}
                            {!saving && lastSaved && (
                                <span className="flex items-center gap-1 text-green-500">
                                    <Save size={10} /> บันทึกแล้ว
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isOnline && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium animate-pulse">
                                <WifiOff size={12} /> ออฟไลน์
                            </div>
                        )}
                        {isOnline && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium">
                                <Wifi size={12} /> ออนไลน์
                            </div>
                        )}
                        {cheatCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                                <Shield size={12} /> {cheatCount}
                            </div>
                        )}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg ${timeLeft !== null && timeLeft <= 60
                            ? 'bg-red-50 text-red-600 animate-pulse'
                            : timeLeft !== null && timeLeft <= 300
                                ? 'bg-yellow-50 text-yellow-600'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                            <Clock size={18} />
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
            <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 ${suspended ? 'opacity-50 pointer-events-none filter blur-sm' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-700">นำทางข้อสอบ</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300 inline-block" /> ตอบแล้ว</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-300 inline-block" /> ยังไม่ตอบ</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {exam.questions.map((q, index) => {
                        const pageNum = Math.ceil((index + 1) / questionsPerPage);
                        const isAnswered = !!answers[q.questionId];
                        const isOnCurrentPage = pageNum === currentPage;
                        return (
                            <button
                                key={q.questionId}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => goToPage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center border-2 transition-all ${
                                    isAnswered
                                        ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                                        : 'bg-white border-gray-300 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50'
                                } ${
                                    isOnCurrentPage ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : ''
                                }`}
                            >
                                {index + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Questions */}
            <div ref={questionsTopRef} className={`space-y-4 ${suspended ? 'opacity-50 pointer-events-none filter blur-sm' : ''}`}>
                {currentQuestions.map((q, index) => {
                    const globalIndex = (currentPage - 1) * questionsPerPage + index;
                    return (
                        <div key={q.questionId} className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-2 ${answers[q.questionId] ? 'border-gray-100' : 'border-orange-200'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex gap-2">
                                    <span className="font-semibold text-indigo-600 whitespace-nowrap">ข้อ {globalIndex + 1}.</span>
                                    <div 
                                        className="prose prose-sm max-w-none text-gray-900"
                                        dangerouslySetInnerHTML={{ __html: q.prompt }}
                                    />
                                </div>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                    {q.points} คะแนน
                                </span>
                            </div>

                            <div className="space-y-2">
                                {q.choices.map((choice) => (
                                    <button
                                        key={choice.value}
                                        type="button"
                                        onClick={() => selectAnswer(q.questionId, choice.value)}
                                        disabled={suspended}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all text-sm ${answers[q.questionId] === choice.value
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${answers[q.questionId] === choice.value
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {choice.value.toUpperCase()}
                                        </div>
                                        <span>{choice.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            <div className={`flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 ${suspended ? 'opacity-50 pointer-events-none filter blur-sm' : ''}`}>
                <button
                    type="button"
                    onClick={() => goToPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ← หน้าก่อนหน้า
                </button>
                <span className="text-sm text-gray-500 font-medium">
                    หน้า {currentPage} / {totalPages}
                </span>
                <button
                    type="button"
                    onClick={() => goToPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    หน้าถัดไป →
                </button>
            </div>

            {/* Submit Button */}
            <div className={`sticky bottom-0 bg-gray-50 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 border-t border-gray-200 ${suspended ? 'opacity-50 pointer-events-none' : ''}`}>
                {answeredCount < totalQuestions && (
                    <p className="text-sm text-orange-600 mb-2">⚠️ ยังตอบไม่ครบ ({answeredCount}/{totalQuestions} ข้อ) — กรุณาตอบให้ครบก่อนส่ง</p>
                )}
                <button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting || suspended || answeredCount < totalQuestions}
                    className={`w-full sm:w-auto px-8 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 ${answeredCount < totalQuestions
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                >
                    <Send size={18} />
                    {submitting ? 'กำลังส่ง...' : `ส่งข้อสอบ (${answeredCount}/${totalQuestions} ข้อ)`}
                </button>
            </div>
        </div>
    );
};

export default TakeExam;
