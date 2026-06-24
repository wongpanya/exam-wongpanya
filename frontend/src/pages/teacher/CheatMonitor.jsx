import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../config/api';
import { useDialog } from '../../components/DialogProvider';
import {
    ArrowLeft, RefreshCw, Shield, AlertTriangle, Eye, EyeOff,
    Copy, Mouse, Keyboard, Monitor, Users, Filter, X, Lock, Unlock,
    Search, SortAsc
} from 'lucide-react';
import { getSocket } from '../../config/socket';

const EVENT_CONFIG = {
    tab_switch: { label: 'สลับแท็บ', color: '#ef4444', bg: '#fef2f2', icon: Monitor },
    blur: { label: 'ออกจากหน้าต่าง', color: '#f97316', bg: '#fff7ed', icon: EyeOff },
    focus: { label: 'กลับมา', color: '#22c55e', bg: '#f0fdf4', icon: Eye },
    copy: { label: 'Copy', color: '#eab308', bg: '#fefce8', icon: Copy },
    cut: { label: 'Cut', color: '#eab308', bg: '#fefce8', icon: Copy },
    paste: { label: 'Paste', color: '#eab308', bg: '#fefce8', icon: Copy },
    right_click: { label: 'คลิกขวา', color: '#a855f7', bg: '#faf5ff', icon: Mouse },
    print_screen: { label: 'PrintScreen', color: '#dc2626', bg: '#fef2f2', icon: Keyboard },
    devtools: { label: 'DevTools', color: '#dc2626', bg: '#fef2f2', icon: Keyboard },
    forbidden_key: { label: 'ปุ่มต้องห้าม', color: '#dc2626', bg: '#fef2f2', icon: Keyboard },
};

const POLL_INTERVAL = 5000;

const CheatMonitor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert, showConfirm } = useDialog();
    const queryParams = new URLSearchParams(location.search);
    const sessionId = queryParams.get('sessionId');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [filterType, setFilterType] = useState('all');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentLogs, setStudentLogs] = useState([]);
    const [loadingStudent, setLoadingStudent] = useState(false);
    const [modalTab, setModalTab] = useState('logs'); // logs, answers
    const pollRef = useRef(null);

    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    const fetchLogs = async () => {
        try {
            const url = sessionId
                ? `/exam-sessions/${id}/cheat-logs?sessionId=${sessionId}`
                : `/exam-sessions/${id}/cheat-logs`;
            const { data: result } = await api.get(url);
            setData(result);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentLogs = async (studentId) => {
        setLoadingStudent(true);
        try {
            const url = sessionId
                ? `/exam-sessions/${id}/students/${studentId}/logs?sessionId=${sessionId}`
                : `/exam-sessions/${id}/students/${studentId}/logs`;
            const { data } = await api.get(url);
            setStudentLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingStudent(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [id, sessionId]);

    // Socket.io for real-time cheat events
    useEffect(() => {
        if (!data?.session) return;

        const socket = getSocket();
        if (!socket) return;

        socket.emit('join-session', data.session);

        const handleCheatEvent = () => {
            fetchLogs();
        };

        socket.on('cheat-event', handleCheatEvent);

        return () => {
            socket.off('cheat-event', handleCheatEvent);
            socket.emit('leave-session', data.session);
        };
    }, [data?.session]);

    const handleStudentClick = (student) => {
        setSelectedStudent(student);
        setModalTab('logs');
        fetchStudentLogs(student._id);
    };

    const handleSuspend = async (suspend) => {
        if (!selectedStudent) return;
        const ok = await showConfirm({
            title: suspend ? 'ระงับการสอบ' : 'ปลดระงับการสอบ',
            message: `คุณต้องการ ${suspend ? 'ระงับ' : 'ปลดระงับ'} การสอบของนักเรียนคนนี้ใช่หรือไม่?`,
            confirmText: suspend ? 'ระงับ' : 'ปลดระงับ',
            variant: suspend ? 'danger' : 'warning',
        });
        if (!ok) return;

        try {
            // Note: Suspension applies to specific attempt found by backend
            // Backend toggleStudentSuspension uses findOne(..., sort: -1) by default
            // If sessionId is provided, we should probably pass it?
            // But current backend endpoint doesn't support sessionId for suspension toggle?
            // Actually, toggleStudentSuspension (step 848) uses findOne without sessionId.
            // It finds LATEST session.
            // If viewing OLD session, suspending might affect NEW session if student is re-taking?
            // Or fails if no new session.
            // For now, assume suspension is only relevant for ACTIVE session.
            // If viewing history (ended), suspension is likely irrelevant.
            // But if user wants to invalidate, maybe?
            // Let's keep it simple.

            await api.post(`/exam-sessions/${id}/students/${selectedStudent._id}/suspend`,
                { suspend }
            );

            // Refresh student logs to get updated status
            await fetchStudentLogs(selectedStudent._id);
            // Refresh main data
            await fetchLogs();
        } catch (err) {
            await showAlert({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถเปลี่ยนสถานะการระงับได้', variant: 'danger' });
        }
    };

    const formatTime = (ts) => {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDateTime = (ts) => {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' +
            d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    const getDuration = (start, end) => {
        if (!start || !end) return '-';
        const diff = new Date(end) - new Date(start);
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes} นาที ${seconds} วินาที`;
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading monitor...</div>;
    if (error && !data) return <div className="p-8 text-center text-red-500">{error}</div>;

    const filteredLogs = filterType === 'all'
        ? data?.logs
        : data?.logs?.filter(l => l.eventType === filterType);

    return (
        <div className="space-y-6 h-[calc(100vh-2rem)] flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                    onClick={() => navigate(sessionId ? `/teacher/exams/${id}/history` : `/teacher/exams/${id}/session`)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="text-red-500" size={28} />
                        {sessionId ? 'บันทึกการทุจริตย้อนหลัง' : 'ตรวจจับการทุจริต'}
                    </h1>
                </div>

                {/* Global Stats */}
                <div className="flex gap-3 text-sm">
                    <div className="px-3 py-1 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 font-medium">
                        <AlertTriangle size={16} /> {data?.totalEvents || 0} ครั้ง
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg shrink-0">
                {['overview', 'students', 'logs'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition capitalize ${activeTab === tab
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab === 'overview' ? 'ภาพรวม' : tab === 'students' ? 'รายบุคคล' : 'Log ทั้งหมด'}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="h-full overflow-y-auto p-1 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold mb-4">ประเภทเหตุการณ์</h3>
                                <div className="space-y-3">
                                    {data?.summary?.map(item => (
                                        <div key={item._id}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">{EVENT_CONFIG[item._id]?.label || item._id}</span>
                                                <span className="font-bold">{item.count}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full"
                                                    style={{
                                                        width: `${(item.count / (data.totalEvents || 1)) * 100}%`,
                                                        backgroundColor: EVENT_CONFIG[item._id]?.color || '#ccc'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold mb-4">นักเรียนที่น่าสงสัยสูงสุด</h3>
                                <div className="space-y-3">
                                    {data?.byStudent?.slice(0, 5).map((s, i) => (
                                        <div key={s._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                                                    {i + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-sm">{s.studentInfo.firstName} {s.studentInfo.lastName}</p>
                                                    <p className="text-xs text-gray-500">{s.studentInfo.email}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                                                {s.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Students Tab */}
                {activeTab === 'students' && (
                    <div className="h-full overflow-y-auto p-1">
                        <div className="grid grid-cols-1 gap-3">
                            {data?.byStudent?.map(s => {
                                const isSuspended = s.status === 'suspended';
                                return (
                                    <div
                                        key={s._id}
                                        onClick={() => handleStudentClick(s)}
                                        className={`flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border cursor-pointer transition hover:shadow-md ${isSuspended ? 'border-red-300 bg-red-50' : 'border-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Avatar or Initials */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isSuspended ? 'bg-red-400' : 'bg-indigo-500'}`}>
                                                {s.studentInfo.firstName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {s.studentInfo.firstName} {s.studentInfo.lastName}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-gray-500">{s.studentInfo.email}</span>
                                                    {isSuspended && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded flex items-center gap-1 font-bold">
                                                            <Lock size={10} /> ระงับการสอบ
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-bold text-gray-700">
                                                    {s.status === 'submitted' ? formatTime(s.submittedAt) : <span className="text-orange-500 text-xs">กำลังทำ...</span>}
                                                </p>
                                                <p className="text-xs text-gray-400">เวลาส่ง</p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-bold text-indigo-600">{s.score} <span className="text-gray-400 font-normal">/ {s.totalPoints}</span></p>
                                                <p className="text-xs text-gray-400">คะแนน</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-bold ${s.count > 5 ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {s.count}
                                                </p>
                                                <p className="text-xs text-gray-400">เหตุการณ์ (รวม {s.totalCount})</p>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-300" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && (
                    <div className="h-full flex flex-col">
                        <div className="flex gap-2 overflow-x-auto pb-4 shrink-0">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${filterType === 'all'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                ทั้งหมด
                            </button>
                            {Object.entries(EVENT_CONFIG).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterType(key)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${filterType === key
                                        ? `bg-gray-800 text-white border-gray-800`
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {config.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 p-1">
                            {filteredLogs?.map((log, i) => {
                                const config = EVENT_CONFIG[log.eventType] || {};
                                const IconComp = config.icon || Shield;
                                return (
                                    <div key={log._id || i} className="bg-white p-3 rounded-lg border border-gray-100 flex items-start gap-3">
                                        <div className="mt-0.5 p-1.5 rounded-full shrink-0" style={{ backgroundColor: config.bg }}>
                                            <IconComp size={14} style={{ color: config.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between">
                                                <span className="font-medium text-sm text-gray-900">
                                                    {log.student?.firstName} {log.student?.lastName}
                                                </span>
                                                <span className="text-xs text-gray-400 font-mono">
                                                    {formatTime(log.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                <span className="font-medium" style={{ color: config.color }}>{config.label}</span>
                                                {log.detail && <span className="text-gray-400"> • {log.detail}</span>}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {selectedStudent.studentInfo.firstName} {selectedStudent.studentInfo.lastName}
                                </h2>
                                <p className="text-sm text-gray-500">{selectedStudent.studentInfo.email}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-50 p-4 rounded-xl text-center">
                                    <p className="text-3xl font-bold text-gray-900">
                                        {studentLogs?.unresolvedCount ?? (studentLogs?.logs?.length || 0)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        เหตุการณ์ (รวม {studentLogs?.logs?.length || 0})
                                    </p>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-100">
                                    <p className="text-3xl font-bold text-indigo-600">
                                        {studentLogs?.score || 0} <span className="text-sm text-gray-500 font-normal">/ {studentLogs?.totalPoints || 0}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">คะแนนสอบ</p>
                                </div>
                                <div className={`p-4 rounded-xl text-center border-2 ${studentLogs?.status === 'suspended'
                                    ? 'bg-red-50 border-red-100'
                                    : 'bg-green-50 border-green-100'
                                    }`}>
                                    <p className={`text-lg font-bold ${studentLogs?.status === 'suspended' ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                        {studentLogs?.status === 'suspended' ? 'ถูกระงับสอบ' : 'กำลังสอบ/ปกติ'}
                                    </p>
                                    <p className="text-xs text-gray-500">สถานะปัจจุบัน</p>
                                </div>
                            </div>

                            {/* Time Info */}
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl mb-6 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">เริ่มทำข้อสอบ</p>
                                    <p className="font-medium text-gray-900">{formatDateTime(studentLogs?.startedAt)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-gray-500 mb-1">ใช้เวลา</p>
                                    <p className="font-medium text-gray-900">{getDuration(studentLogs?.startedAt, studentLogs?.submittedAt)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 mb-1">ส่งข้อสอบ</p>
                                    <p className="font-medium text-gray-900">
                                        {studentLogs?.status === 'submitted'
                                            ? formatDateTime(studentLogs?.submittedAt)
                                            : <span className="text-orange-500">ยังไม่ส่ง</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="mb-6">
                                {studentLogs?.status === 'suspended' ? (
                                    <button
                                        onClick={() => handleSuspend(false)}
                                        className="w-full py-3 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 hover:bg-green-100 transition flex items-center justify-center gap-2"
                                    >
                                        <Unlock size={18} /> ปลดล็อกการสอบ
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSuspend(true)}
                                        className={`w-full py-3 font-bold rounded-xl border transition flex items-center justify-center gap-2 ${sessionId && data?.sessionStatus !== 'active' ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                            }`}
                                        disabled={!!sessionId && data?.sessionStatus !== 'active'}
                                        title={sessionId && data?.sessionStatus !== 'active' ? "ไม่สามารถระงับการสอบในโหมดย้อนหลังได้" : ""}
                                    >
                                        <Lock size={18} /> ระงับการสอบชั่วคราว
                                    </button>
                                )}
                                <p className="text-center text-xs text-gray-400 mt-2">
                                    {sessionId && data?.sessionStatus !== 'active'
                                        ? "ดูประวัติย้อนหลัง - ไม่สามารถระงับการสอบได้"
                                        : "เมื่อระงับ นักเรียนจะไม่สามารถทำข้อสอบต่อได้จนกว่าจะปลดล็อก"}
                                </p>
                            </div>

                            {/* Modal Tabs */}
                            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setModalTab('logs')}
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition ${modalTab === 'logs' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    ประวัติการทุจริต
                                </button>
                                <button
                                    onClick={() => setModalTab('answers')}
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition ${modalTab === 'answers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    คำตอบที่ส่ง ({studentLogs?.answers?.length || 0})
                                </button>
                            </div>

                            {/* Logs Content */}
                            {modalTab === 'logs' && (
                                <div className="space-y-3">
                                    {loadingStudent ? (
                                        <p className="text-center text-gray-400 text-sm">Loading logs...</p>
                                    ) : studentLogs?.logs?.length === 0 ? (
                                        <p className="text-center text-gray-400 text-sm py-4">ไม่พบเหตุการณ์ผิดปกติ</p>
                                    ) : (
                                        studentLogs?.logs?.map((log, i) => {
                                            const config = EVENT_CONFIG[log.eventType] || {};
                                            return (
                                                <div key={i} className="flex gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />
                                                        {i !== (studentLogs.logs.length - 1) && <div className="w-0.5 h-full bg-gray-100 -mb-2" />}
                                                    </div>
                                                    <div className="pb-4">
                                                        <p className="text-sm font-medium text-gray-900">{config.label || log.eventType}</p>
                                                        <p className="text-xs text-gray-500">{formatTime(log.timestamp)}</p>
                                                        {log.detail && (
                                                            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 border border-gray-100">
                                                                {log.detail}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* Answers Content */}
                            {modalTab === 'answers' && (
                                <div className="space-y-4">
                                    {loadingStudent ? (
                                        <p className="text-center text-gray-400 text-sm">Loading answers...</p>
                                    ) : !studentLogs?.exam ? (
                                        <p className="text-center text-gray-400 text-sm py-4">ไม่พบข้อมูลคำตอบ</p>
                                    ) : (
                                        studentLogs.exam.questions.map((q, i) => {
                                            const studentAnswer = studentLogs.answers?.find(a => a.questionId === q.questionId)?.selectedAnswer;
                                            const isCorrect = String(studentAnswer) === String(q.correctAnswer);
                                            const hasAnswered = studentAnswer !== undefined && studentAnswer !== '';

                                            return (
                                                <div key={i} className={`border rounded-lg p-4 ${isCorrect ? 'bg-green-50 border-green-200' : hasAnswered ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                                    <div className="flex justify-between mb-2">
                                                        <h4 className="font-semibold text-gray-900">ข้อ {i + 1}</h4>
                                                        <span className="text-xs font-bold px-2 py-1 rounded bg-white border">
                                                            {isCorrect ? `${q.points} / ${q.points}` : `0 / ${q.points}`} คะแนน
                                                        </span>
                                                    </div>
                                                    <div 
                                                        className="prose prose-sm max-w-none text-gray-800 mb-3"
                                                        dangerouslySetInnerHTML={{ __html: q.prompt }}
                                                    />

                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-start gap-2">
                                                            <span className="min-w-[60px] text-gray-500">ตอบ:</span>
                                                            <span className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                                                                {hasAnswered ? (
                                                                    q.choices.find(c => c.value === studentAnswer)?.label || studentAnswer
                                                                ) : (
                                                                    <span className="text-gray-400 italic">ไม่ตอบ</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {!isCorrect && (
                                                            <div className="flex items-start gap-2">
                                                                <span className="min-w-[60px] text-gray-500">เฉลย:</span>
                                                                <span className="font-medium text-green-700">
                                                                    {q.choices.find(c => c.value === q.correctAnswer)?.label || q.correctAnswer}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

// ChevronRight helper (was missing in imports in previous chunks sometimes, safe to re-add)
const ChevronRight = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export default CheatMonitor;
