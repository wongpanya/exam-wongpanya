import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../config/api';
import {
    Clock,
    CheckCircle2,
    AlertCircle,
    Send,
    FileText,
    Sparkles,
    Check,
    ArrowLeft,
    Layers,
    RotateCcw,
    Loader2
} from 'lucide-react';

const StudentTakeTestExam = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [session, setSession] = useState(null);
    const [answers, setAnswers] = useState({});
    
    // Submission state
    const [submittedAttemptId, setSubmittedAttemptId] = useState(null);
    const [attemptData, setAttemptData] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);

    // Fetch session details
    useEffect(() => {
        const fetchSession = async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get(`/grading/test-sessions/${sessionId}`);
                setSession(data);
                if (data.durationMin) {
                    setTimeLeft(data.durationMin * 60);
                }
            } catch (err) {
                console.error('Failed to load test session:', err);
                setError(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลห้องสอบได้ หรือห้องสอบปิดแล้ว');
            } finally {
                setLoading(false);
            }
        };

        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);

    // Timer Countdown
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submittedAttemptId) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft, submittedAttemptId]);

    // Poll attempt status until grading is completed
    useEffect(() => {
        if (!submittedAttemptId || attemptData?.gradingStatus === 'completed') return;

        const pollStatus = async () => {
            try {
                const { data } = await api.get(`/grading/test-sessions/${sessionId}/attempts/${submittedAttemptId}`);
                setAttemptData(data);
            } catch (err) {
                console.error('Poll attempt error:', err);
            }
        };

        pollStatus();
        const interval = setInterval(pollStatus, 2500);
        return () => clearInterval(interval);
    }, [submittedAttemptId, attemptData?.gradingStatus, sessionId]);

    const formatTime = (seconds) => {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value,
        }));
    };

    const handleCheckboxChange = (questionId, choiceValue) => {
        const current = String(answers[questionId] || '').split(',').filter(Boolean);
        const set = new Set(current);
        if (set.has(choiceValue)) set.delete(choiceValue);
        else set.add(choiceValue);
        const next = [...set].sort().join(',');
        handleAnswerChange(questionId, next);
    };

    const handleSubmit = async (autoSubmit = false) => {
        if (!autoSubmit && !window.confirm('คุณแน่ใจหรือไม่ว่าต้องการส่งคำตอบ? เมื่อส่งแล้วจะไม่สามารถแก้ไขได้')) {
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const formattedAnswers = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
                questionId,
                selectedAnswer,
            }));

            const { data } = await api.post(`/grading/test-sessions/${sessionId}/submit`, {
                answers: formattedAnswers,
            });

            setSubmittedAttemptId(data.attemptId);
        } catch (err) {
            console.error('Submit test exam failed:', err);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำตอบ');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 text-sm">กำลังเข้าสู่ห้องสอบจำลอง...</p>
                </div>
            </div>
        );
    }

    if (error && !session && !submittedAttemptId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">ไม่สามารถเข้าห้องสอบได้</h2>
                    <p className="text-sm text-gray-600">{error}</p>
                    <Link
                        to="/student"
                        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
                    >
                        <ArrowLeft size={16} /> กลับสู่หน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    // Success & Live Polling Screen
    if (submittedAttemptId) {
        const isGrading = attemptData?.gradingStatus === 'grading' || !attemptData;
        const isCompleted = attemptData?.gradingStatus === 'completed';

        return (
            <div className="min-h-screen bg-gray-50 py-10 px-4">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={36} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">ส่งคำตอบเรียบร้อยแล้ว!</h1>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">
                            คำตอบของคุณได้รับการบันทึกลงในระบบเรียบร้อยแล้ว
                        </p>

                        {isGrading && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold animate-pulse">
                                <Loader2 size={15} className="animate-spin" />
                                ระบบกำลังประมวลผลการตรวจด้วยโมเดล AI ในพื้นหลัง...
                            </div>
                        )}

                        <div className="pt-4 flex justify-center gap-3">
                            <Link
                                to="/student"
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow"
                            >
                                กลับสู่หน้าหลักนักเรียน
                            </Link>
                        </div>
                    </div>

                    {/* AI Feedback Preview once completed */}
                    {isCompleted && attemptData?.evaluations && attemptData.evaluations.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Sparkles size={18} className="text-indigo-600" />
                                ผลการประเมินและข้อคิดเห็นจาก AI
                            </h2>

                            <div className="space-y-4">
                                {attemptData.evaluations.map((qEval, idx) => {
                                    const primaryEval = qEval.modelEvaluations?.[0];
                                    return (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-gray-900">ข้อที่ {idx + 1}</span>
                                                {primaryEval?.status === 'succeeded' && (
                                                    <span className="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                                                        คะแนน: {primaryEval.totalScore}
                                                    </span>
                                                )}
                                            </div>

                                            {primaryEval?.feedback && (
                                                <p className="text-xs text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-100">
                                                    {primaryEval.feedback}
                                                </p>
                                            )}

                                            {primaryEval?.rubricScores && primaryEval.rubricScores.length > 0 && (
                                                <div className="space-y-1.5 pt-1">
                                                    {primaryEval.rubricScores.map((r, rIdx) => (
                                                        <div key={rIdx} className="text-[11px] text-gray-600 flex justify-between">
                                                            <span>• {r.feedback || `เกณฑ์ที่ ${rIdx + 1}`}</span>
                                                            <span className="font-semibold text-gray-900">{r.score} คะแนน</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
    const totalQuestions = session?.questions?.length || 0;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                    <div>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase">
                            ห้องสอบจำลอง (AI Test Exam)
                        </span>
                        <h1 className="text-base font-bold text-gray-900 truncate mt-0.5">{session?.title}</h1>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Countdown Timer */}
                        {timeLeft !== null && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold shadow-sm ${timeLeft <= 300 ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-gray-100 text-gray-800'}`}>
                                <Clock size={16} />
                                {formatTime(timeLeft)}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow flex items-center gap-1.5"
                        >
                            {submitting ? 'กำลังส่ง...' : <><Send size={13} /> ส่งคำตอบ</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Questions Form */}
            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 mt-2">
                {session?.description && (
                    <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                        {session.description}
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0 text-red-500" />
                        {error}
                    </div>
                )}

                {session?.questions?.map((q, qIndex) => {
                    const currentAnswer = answers[q.questionId] || '';

                    return (
                        <div
                            key={q.questionId || qIndex}
                            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                                        {qIndex + 1}
                                    </span>
                                    ข้อที่ {qIndex + 1}
                                </h3>
                                <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                                    {q.points} คะแนน
                                </span>
                            </div>

                            {/* Prompt HTML */}
                            <div
                                className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: q.prompt }}
                            />

                            {/* Question Input Types */}
                            {q.type === 'text' ? (
                                <div className="space-y-1.5 pt-2">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        พิมพ์คำตอบของคุณ:
                                    </label>
                                    <textarea
                                        rows={6}
                                        value={currentAnswer}
                                        onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
                                        placeholder="พิมพ์คำตอบอย่างละเอียดที่นี่..."
                                        className="w-full p-4 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                    />
                                    <div className="text-right text-[11px] text-gray-400">
                                        {currentAnswer.length} ตัวอักษร
                                    </div>
                                </div>
                            ) : q.type === 'checkbox' ? (
                                <div className="space-y-2 pt-2">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        เลือกคำตอบที่ถูกต้อง (เลือกได้หลายข้อ):
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {q.choices?.map((choice, cIdx) => {
                                            const isSelected = String(currentAnswer).split(',').includes(choice.value);
                                            return (
                                                <div
                                                    key={cIdx}
                                                    onClick={() => handleCheckboxChange(q.questionId, choice.value)}
                                                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center gap-3 ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${isSelected ? 'bg-indigo-600 text-white' : 'border border-gray-300'}`}>
                                                        {isSelected && <Check size={12} />}
                                                    </div>
                                                    <span className="text-xs text-gray-900 font-medium">
                                                        <span className="font-bold mr-1.5">{choice.value.toUpperCase()}.</span>
                                                        {choice.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 pt-2">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        เลือกคำตอบที่ถูกต้อง:
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {q.choices?.map((choice, cIdx) => {
                                            const isSelected = currentAnswer === choice.value;
                                            return (
                                                <div
                                                    key={cIdx}
                                                    onClick={() => handleAnswerChange(q.questionId, choice.value)}
                                                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center gap-3 ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${isSelected ? 'bg-indigo-600 text-white' : 'border border-gray-300'}`}>
                                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                                    </div>
                                                    <span className="text-xs text-gray-900 font-medium">
                                                        <span className="font-bold mr-1.5">{choice.value.toUpperCase()}.</span>
                                                        {choice.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Floating Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-gray-600">
                        ตอบแล้ว <span className="font-bold text-indigo-600">{answeredCount}</span> จาก {totalQuestions} ข้อ
                    </div>
                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow flex items-center gap-2"
                    >
                        {submitting ? 'กำลังส่งคำตอบ...' : <><Send size={15} /> ส่งคำตอบทั้งหมด</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentTakeTestExam;
