import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../config/api';
import { useDialog } from '../../components/DialogProvider';
import { Users, StopCircle, RefreshCw, Clock, AlertTriangle, Shield, Settings, Shuffle } from 'lucide-react';

const ExamSession = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showConfirm } = useDialog();
    const [exam, setExam] = useState(null);
    const [session, setSession] = useState(null);
    const [qrData, setQrData] = useState('');
    const [qrCountdown, setQrCountdown] = useState(0);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Settings (shown before starting)
    const [showSettings, setShowSettings] = useState(true);
    const [randomizeQR, setRandomizeQR] = useState(true);
    const [rotateInterval, setRotateInterval] = useState(10);
    const [shuffleQuestions, setShuffleQuestions] = useState(false);

    const [maxCheatEvents, setMaxCheatEvents] = useState(1);

    const qrTimerRef = useRef(null);
    const countdownRef = useRef(null);

    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    const fetchQR = useCallback(async () => {
        try {
            const { data } = await api.get(`/exam-sessions/${id}/qr`, getConfig());
            // Backend sends token object, stringify for QR
            const tokenStr = typeof data.token === 'object' ? JSON.stringify(data.token) : data.token;
            setQrData(tokenStr);
            setQrCountdown(rotateInterval);
        } catch (err) {
            console.error('QR fetch failed:', err);
        }
    }, [id, rotateInterval]);

    const fetchStudents = useCallback(async () => {
        try {
            const { data } = await api.get(`/exam-sessions/${id}/attempts`, getConfig());
            setStudents(data);
        } catch (err) {
            console.error('Students fetch failed:', err);
        }
    }, [id]);

    // Check if there's an existing active session
    useEffect(() => {
        const checkExisting = async () => {
            try {
                const examRes = await api.get(`/exams/${id}`, getConfig());
                setExam(examRes.data);

                const statusRes = await api.get(`/exam-sessions/${id}/status`, getConfig());
                if (statusRes.data && statusRes.data.status === 'active') {
                    // Session already exists, skip settings
                    setSession(statusRes.data); // Backend returns the session object directly
                    setRandomizeQR(statusRes.data.qrRotateInterval > 0);
                    setRotateInterval(statusRes.data.qrRotateInterval > 0 ? statusRes.data.qrRotateInterval : 10);
                    setShuffleQuestions(statusRes.data.shuffleQuestions || false);
                    setMaxCheatEvents(statusRes.data.maxCheatEvents || 1);
                    setShowSettings(false);
                    await fetchQR();
                    await fetchStudents();
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load exam');
            } finally {
                setLoading(false);
            }
        };

        checkExisting();
    }, [id]);

    const handleStartSession = async () => {
        setLoading(true);
        try {
            const { data } = await api.post(
                `/exam-sessions/${id}/start`,
                { 
                    qrRotateInterval: randomizeQR ? rotateInterval : 0, 
                    shuffleQuestions, 
                    maxCheatEvents 
                },
                getConfig()
            );
            setSession(data);
            setShowSettings(false);
            await fetchQR();
            await fetchStudents();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start');
        } finally {
            setLoading(false);
        }
    };

    // QR rotation timer
    useEffect(() => {
        if (!session || session.status === 'ended' || showSettings) return;

        // If randomize is disabled, interval is 0
        const interval = randomizeQR ? rotateInterval : 0;
        
        if (interval > 0) {
            qrTimerRef.current = setInterval(() => {
                fetchQR();
                fetchStudents();
            }, interval * 1000);
        } else {
            // Still fetch students even if QR is not rotating
            qrTimerRef.current = setInterval(() => {
                fetchStudents();
            }, 5000);
        }

        return () => {
            if (qrTimerRef.current) clearInterval(qrTimerRef.current);
        };
    }, [session, rotateInterval, randomizeQR, fetchQR, fetchStudents, showSettings]);

    // Countdown timer
    useEffect(() => {
        if (!session || session.status === 'ended' || showSettings || (!randomizeQR)) return;

        countdownRef.current = setInterval(() => {
            setQrCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [session, showSettings, randomizeQR]);

    const handleStop = async () => {
        const ok = await showConfirm({
            title: 'หยุดการสอบ',
            message: 'คุณต้องการหยุดการสอบใช่หรือไม่?\nนักเรียนที่กำลังสอบจะไม่สามารถส่งคำตอบได้อีก',
            confirmText: 'หยุดสอบ',
            variant: 'danger',
        });
        if (!ok) return;

        try {
            await api.post(`/exam-sessions/${id}/stop`, {}, getConfig());
            setSession(prev => ({ ...prev, status: 'ended' }));
            if (qrTimerRef.current) clearInterval(qrTimerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to stop exam');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
                <p className="text-red-600">{error}</p>
                <button onClick={() => navigate(`/teacher/exams/${id}`)} className="mt-4 text-indigo-600 hover:underline">
                    ← กลับไปหน้าข้อสอบ
                </button>
            </div>
        );
    }

    // --- Settings Screen ---
    if (showSettings && !session) {
        return (
            <div className="max-w-lg mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/teacher/exams/${id}`)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <Settings size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าการสอบ</h1>
                        <p className="text-gray-500 text-sm">{exam?.title}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                    {/* QR Interval Settings */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                ⏱️ ความถี่หมุน QR Code (วินาที)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-sm text-gray-600">สุ่ม QR Code</span>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={randomizeQR}
                                    onChange={(e) => setRandomizeQR(e.target.checked)}
                                />
                                <div className={`relative w-10 h-5 rounded-full transition ${randomizeQR ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${randomizeQR ? 'translate-x-5' : ''}`} />
                                </div>
                            </label>
                        </div>
                        
                        {randomizeQR ? (
                            <>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="5"
                                        max="30"
                                        step="5"
                                        value={rotateInterval || 10}
                                        onChange={(e) => setRotateInterval(Number(e.target.value))}
                                        className="flex-1"
                                    />
                                    <span className="text-lg font-bold text-indigo-600 w-10 text-center">
                                        {rotateInterval || 10}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    ยิ่งหมุนเร็ว ยิ่งปลอดภัย (แนะนำ 10 วินาที)
                                </p>
                            </>
                        ) : (
                            <p className="text-xs text-orange-500 mt-1">
                                ⚠️ ปิดการหมุน QR Code: นักเรียนสามารถใช้ QR ตลอดชีพถ่ายรูปเก็บไว้เพื่อเข้าสอบได้ตลอดเวลา
                            </p>
                        )}
                    </div>

                    {/* Security Auto-Suspend */}
                    <div className="border-t border-gray-100 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Shield size={16} className="text-red-500" /> ระงับการสอบอัตโนมัติเมื่อ:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                            {[
                                'สลับแท็บ / ย่อหน้าต่าง',
                                'คลิกนอกหน้าต่าง (Blur)',
                                'คัดลอก / วาง (Copy/Paste)',
                                'คลิกขวา (Right Click)',
                                'จับภาพหน้าจอ (PrintScreen)',
                                'เปิด DevTools (F12)',
                                'กดปุ่มลัดต้องห้าม (Ctrl+C, etc.)'
                            ].map((label, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Shield size={14} className="text-gray-400" />
                                    {label}
                                </div>
                            ))}
                        </div>


                        <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-100">
                            <label className="flex items-center gap-3 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={maxCheatEvents > 0}
                                    onChange={(e) => setMaxCheatEvents(e.target.checked ? 1 : 0)}
                                />
                                <div className={`relative w-10 h-5 rounded-full transition ${maxCheatEvents > 0 ? 'bg-red-500' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${maxCheatEvents > 0 ? 'translate-x-5' : ''}`} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                    ระงับการสอบอัตโนมัติ (Auto-Suspend)
                                </span>
                            </label>

                            {maxCheatEvents > 0 && (
                                <div className="flex items-center gap-3 ml-1">
                                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                        ⚠️ จำนวนครั้งที่ยอมให้ทำผิดกฎ:
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={maxCheatEvents}
                                        onChange={(e) => setMaxCheatEvents(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center font-bold text-red-600 focus:ring-red-500 focus:border-red-500"
                                    />
                                    <p className="text-xs text-gray-500">
                                        (ครั้งที่ {maxCheatEvents} จะถูกระงับทันที)
                                    </p>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-gray-400 mt-2">
                            * หากเปิดใช้งาน เมื่อนักเรียนทำผิดกฎครบจำนวนครั้ง ระบบจะระงับการสอบทันที (Lock หน้าจอ)
                        </p>
                    </div>

                    {/* Shuffle */}
                    <div className="border-t border-gray-100 pt-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={shuffleQuestions}
                                onChange={(e) => setShuffleQuestions(e.target.checked)}
                            />
                            <div className={`relative w-12 h-6 rounded-full transition ${shuffleQuestions ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${shuffleQuestions ? 'translate-x-6' : ''}`} />
                            </div>
                            <div>
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    <Shuffle size={14} /> สุ่มลำดับข้อสอบ
                                </span>
                                <p className="text-xs text-gray-400">นักเรียนแต่ละคนจะเห็นข้อสอบคนละลำดับ</p>
                            </div>
                        </label>
                    </div>

                    {/* Duration info */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock size={14} /> ระยะเวลาสอบ: <strong>{exam?.durationMin} นาที</strong>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            (กำหนดไว้ในข้อสอบ แก้ไขได้ที่หน้าแก้ไขข้อสอบ)
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleStartSession}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg shadow-green-200"
                >
                    🚀 เริ่มสอบ
                </button>
            </div >
        );
    }

    const isEnded = session?.status === 'ended';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {isEnded ? '🔴 สอบเสร็จสิ้น' : '🟢 กำลังสอบ'}
                    </h1>
                    <p className="text-gray-500 mt-1">{exam?.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        {shuffleQuestions && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">🔀 สุ่มข้อ</span>}
                        {rotateInterval > 0 && randomizeQR ? (
                            <span className="bg-gray-100 px-2 py-0.5 rounded">QR หมุนทุก {rotateInterval}s</span>
                        ) : (
                            <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded">QR แบบคงที่</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/teacher/exams/${id}/monitor`)}
                        className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium flex items-center gap-2 transition text-sm border border-red-200"
                    >
                        <Shield size={16} /> ตรวจจับทุจริต
                    </button>
                    {!isEnded && (
                        <button
                            onClick={handleStop}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition"
                        >
                            <StopCircle size={18} /> หยุดสอบ
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QR Code Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code เข้าสอบ</h2>

                    {isEnded ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">การสอบสิ้นสุดแล้ว</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-inner">
                                {qrData ? (
                                    <QRCodeSVG
                                        value={qrData}
                                        size={320}
                                        level="M"
                                        includeMargin
                                        marginSize={4}
                                        bgColor="#ffffff"
                                        fgColor="#000000"
                                    />
                                ) : (
                                    <div className="w-[280px] h-[280px] flex items-center justify-center bg-gray-100 rounded">
                                        <RefreshCw className="animate-spin text-gray-400" size={32} />
                                    </div>
                                )}
                            </div>

                            {randomizeQR && rotateInterval > 0 ? (
                                <>
                                    <div className="mt-4 flex items-center gap-2 text-sm">
                                        <Clock size={16} className="text-gray-400" />
                                        <span className="text-gray-500">
                                            QR ใหม่ใน: <span className={`font-bold ${qrCountdown <= 3 ? 'text-red-500' : 'text-indigo-600'}`}>{qrCountdown}</span> วินาที
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 text-center">
                                        QR หมุนทุก {rotateInterval} วินาที • Token หมดอายุ {rotateInterval + 5} วินาที
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-medium text-orange-600 mt-4 text-center bg-orange-50 px-3 py-1 rounded-full">
                                    ไม่ต้องสุ่ม QR Code โทเค็นเปิดยาว 24 ชั่วโมง
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Students Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Users size={20} /> นักเรียนที่เข้าสอบ
                        </h2>
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                            {students.length} คน
                        </span>
                    </div>

                    {students.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Users className="mx-auto mb-2" size={40} />
                            <p>ยังไม่มีนักเรียนเข้าสอบ</p>
                            <p className="text-xs mt-1">รอนักเรียนสแกน QR Code</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {students.map((s) => (
                                <div
                                    key={s._id}
                                    className={`flex items-center justify-between p-3 rounded-lg ${s.status === 'submitted'
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-gray-50 border border-gray-200'
                                        }`}
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">
                                            {s.student?.firstName} {s.student?.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">{s.student?.email}</p>
                                    </div>
                                    <div className="text-right">
                                        {s.status === 'submitted' ? (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                ส่งแล้ว ({s.score}/{s.totalPoints})
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                                กำลังสอบ
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isEnded && (
                        <button
                            onClick={fetchStudents}
                            className="mt-4 w-full py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center justify-center gap-1"
                        >
                            <RefreshCw size={14} /> รีเฟรช
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamSession;
