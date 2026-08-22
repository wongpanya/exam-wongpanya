import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../config/api';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    Copy,
    Check,
    RefreshCw,
    Users,
    Sparkles,
    Zap,
    Scale,
    Trophy,
    ExternalLink,
    FileSpreadsheet,
    Eye,
    X,
    Radio,
    Layers,
    Share2,
    ShieldAlert,
    BarChart3,
    CheckCheck,
    Trash2,
    FileText
} from 'lucide-react';

const TestAIExamSessionResult = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    // Copy states
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedPin, setCopiedPin] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    // Detailed Student Modal
    const [selectedStudentAttempt, setSelectedStudentAttempt] = useState(null);
    const [modalModelTab, setModalModelTab] = useState('all');

    const fetchSessionResults = async (showRefreshSpinner = false) => {
        if (showRefreshSpinner) setRefreshing(true);
        try {
            const res = await api.get(`/grading/test-sessions/${sessionId}/results`);
            setData(res.data);
            setError('');
        } catch (err) {
            console.error('Fetch session results failed:', err);
            setError(err.response?.data?.message || 'ไม่สามารถโหลดผลการทดสอบของห้องสอบนี้ได้');
        } finally {
            setLoading(false);
            if (showRefreshSpinner) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSessionResults();
    }, [sessionId]);

    // Auto poll results every 4 seconds if there are active grading attempts
    useEffect(() => {
        const interval = setInterval(() => {
            if (data?.attempts?.some(a => a.gradingStatus === 'grading')) {
                fetchSessionResults(false);
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [data]);

    const handleToggleSessionStatus = async () => {
        try {
            const res = await api.patch(`/grading/test-sessions/${sessionId}/end`);
            setData(prev => ({
                ...prev,
                session: res.data.session
            }));
        } catch (err) {
            console.error('Toggle status error:', err);
            alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะห้องสอบ');
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/student/test-exam/${sessionId}`;
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCopyPin = () => {
        if (!data?.session?.shortCode) return;
        navigator.clipboard.writeText(data.session.shortCode);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    const exportToExcel = () => {
        if (!data || !data.attempts || data.attempts.length === 0) {
            alert('ยังไม่มีข้อมูลการส่งข้อสอบของนักเรียนเพื่อส่งออก');
            return;
        }

        const models = data.session.modelsToCompare || [];
        const rows = data.attempts.map((att, idx) => {
            const row = {
                'ลำดับ': idx + 1,
                'ชื่อ-นามสกุล': `${att.studentInfo?.firstName || ''} ${att.studentInfo?.lastName || ''}`.trim() || 'นักเรียน',
                'อีเมล': att.studentInfo?.email || '',
                'คำตอบที่ส่ง': att.answers?.[0]?.selectedAnswer || '',
                'เวลาที่ส่ง': new Date(att.submittedAt).toLocaleString('th-TH'),
                'สถานะการตรวจ': att.gradingStatus === 'completed' ? 'ตรวจเสร็จแล้ว' : 'กำลังตรวจ',
            };

            models.forEach((m) => {
                const evalItem = att.evaluations?.[0]?.modelEvaluations?.find(
                    e => e.provider === m.provider && e.model === m.model
                );
                row[`คะแนน [${m.label}]`] = evalItem?.totalScore ?? '-';
                row[`ความเร็ว (ms) [${m.label}]`] = evalItem?.latencyMs ?? '-';
                row[`ข้อคิดเห็น [${m.label}]`] = evalItem?.feedback ?? '';
            });

            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ผลการทดสอบ AI');
        XLSX.writeFile(workbook, `AI_Benchmark_Session_${data.session.shortCode || sessionId}.xlsx`);
    };

    const handleDeleteSession = async () => {
        if (!window.confirm('คุณต้องการลบห้องสอบจำลองนี้หรือไม่?\nข้อมูลการส่งคำตอบและผลการตรวจทั้งหมดใน Session นี้จะถูกลบถาวร')) return;
        try {
            await api.delete(`/grading/test-sessions/${sessionId}`);
            navigate('/teacher/test-ai-exam');
        } catch (err) {
            alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ Session');
        }
    };

    const liveStudentUrl = `${window.location.origin}/student/test-exam/${sessionId}`;

    if (loading && !data) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 text-sm">กำลังโหลดข้อมูลผลการทดสอบ Session...</p>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="max-w-xl mx-auto my-8 px-4">
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">ไม่พบข้อมูลห้องสอบจำลอง</h2>
                    <p className="text-sm text-gray-600">{error}</p>
                    <Link
                        to="/teacher/test-ai-exam"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
                    >
                        <ArrowLeft size={16} /> กลับสู่หน้าห้องทดลอง
                    </Link>
                </div>
            </div>
        );
    }

    const { session, attempts, aggregateInsights } = data;
    const models = session.modelsToCompare || [];
    const questionPoints = session.questions?.[0]?.points || 10;

    return (
        <div className="space-y-6 w-full min-w-0 pb-16">
            {/* Header Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
                <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Link
                            to="/teacher/test-ai-exam"
                            className="inline-flex items-center gap-1 font-semibold text-gray-500 hover:text-indigo-600 transition"
                        >
                            <ArrowLeft size={14} /> ห้องทดลองข้อสอบ
                        </Link>
                        <span className="text-gray-300">/</span>
                        <span className="font-semibold text-indigo-600">ผลการทดสอบ Session</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words leading-tight">
                        {session.title}
                    </h1>
                    <p className="text-xs text-gray-500">
                        สร้างเมื่อ {new Date(session.createdAt).toLocaleString('th-TH')} • เปรียบเทียบ {models.length} โมเดล AI
                    </p>
                </div>

                {/* Actions Button Group */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                        type="button"
                        onClick={() => fetchSessionResults(true)}
                        disabled={refreshing}
                        className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        รีเฟรช
                    </button>

                    <button
                        type="button"
                        onClick={exportToExcel}
                        className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <FileSpreadsheet size={15} /> ส่งออก Excel
                    </button>

                    <button
                        type="button"
                        onClick={handleToggleSessionStatus}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer ${session.status === 'active' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
                    >
                        {session.status === 'active' ? 'ปิดห้องสอบ' : 'เปิดห้องสอบใหม่'}
                    </button>

                    <button
                        type="button"
                        onClick={handleDeleteSession}
                        className="px-3 py-2 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer"
                        title="ลบ Session นี้ถาวร"
                    >
                        <Trash2 size={14} /> ลบ
                    </button>
                </div>
            </div>

            {/* Session Join Banner Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-100 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-center min-w-0">
                <div className="lg:col-span-2 space-y-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${session.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                            {session.status === 'active' ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> : null}
                            {session.status === 'active' ? 'ห้องสอบกำลังเปิดอยู่ (Active)' : 'ห้องสอบปิดแล้ว (Ended)'}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">ส่งคำตอบแล้ว {attempts.length} คน</span>
                    </div>

                    <div className="min-w-0">
                        <label className="text-xs font-semibold text-gray-700 block mb-1">ลิงก์เข้าสอบสำหรับนักเรียน:</label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                            <input
                                type="text"
                                readOnly
                                value={liveStudentUrl}
                                className="flex-1 min-w-0 w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-indigo-900 font-mono select-all outline-none truncate"
                            />
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shrink-0 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                                {copiedLink ? <CheckCheck size={14} /> : <Copy size={14} />}
                                {copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 pt-1 flex-wrap">
                        <div>
                            <span className="text-xs text-gray-500 font-medium">รหัส PIN 6 หลัก:</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-2xl font-black font-mono text-indigo-700 tracking-wider">
                                    {session.shortCode}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyPin}
                                    className="p-1 text-gray-400 hover:text-indigo-600 transition cursor-pointer"
                                    title="คัดลอก PIN"
                                >
                                    <Copy size={15} />
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5 border border-indigo-100 self-end mb-1 cursor-pointer"
                        >
                            <Share2 size={13} /> ขยาย QR Code
                        </button>
                    </div>
                </div>

                {/* QR Code preview */}
                <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                    <QRCodeSVG value={liveStudentUrl} size={96} level="M" />
                    <span className="text-[10px] font-medium text-gray-500 mt-1.5 text-center">สแกนเพื่อเข้าสอบทันที</span>
                </div>
            </div>

            {/* Aggregated Model Performance Summary Cards */}
            {aggregateInsights && (
                <div className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 size={17} className="text-indigo-600" />
                            สรุปภาพรวมเปรียบเทียบโมเดล AI ใน Session นี้ ({attempts.length} นักเรียน)
                        </h2>
                    </div>

                    {/* Model KPI Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-0">
                        {aggregateInsights.modelSummaries?.map((mStat, idx) => {
                            const isFastest = aggregateInsights.fastestModel?.model === mStat.model;
                            const isHighestScore = aggregateInsights.highestScoringModel?.model === mStat.model;
                            const isHighestQuality = aggregateInsights.highestQualityModel?.model === mStat.model;

                            return (
                                <div
                                    key={idx}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition min-w-0"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${mStat.provider === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                {mStat.provider}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                                                <Clock size={11} /> {mStat.averageLatencyMs} ms
                                            </span>
                                        </div>
                                        <div className="font-bold text-sm text-gray-900 truncate" title={mStat.label}>
                                            {mStat.label}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono truncate" title={mStat.model}>
                                            {mStat.model}
                                        </div>
                                    </div>

                                    {/* Smart Tags */}
                                    <div className="flex flex-wrap gap-1">
                                        {isFastest && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded flex items-center gap-0.5">
                                                <Zap size={10} /> เร็วที่สุด
                                            </span>
                                        )}
                                        {isHighestScore && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded flex items-center gap-0.5">
                                                <Trophy size={10} /> คะแนนสูงสุด
                                            </span>
                                        )}
                                        {isHighestQuality && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded flex items-center gap-0.5">
                                                <Sparkles size={10} /> อ้างอิงหลักฐานแม่นยำ
                                            </span>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 flex items-end justify-between">
                                        <div>
                                            <span className="text-[10px] text-gray-500">คะแนนเฉลี่ย:</span>
                                            <div className="text-xl font-black text-indigo-600">
                                                {mStat.averageScore} <span className="text-xs font-normal text-gray-400">/ {questionPoints}</span>
                                            </div>
                                        </div>
                                        <div className="text-right text-[11px]">
                                            <div className="text-gray-500">Evidence Quote</div>
                                            <div className="font-bold text-emerald-600">{mStat.evidenceQualityScore}%</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Per-Student Submissions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-4 p-4 sm:p-5 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 min-w-0">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Users size={18} className="text-indigo-600" />
                            ผลการตรวจแยกตามรายบุคคล ({attempts.length} คน)
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            คลิกที่ปุ่ม "ดูวิธีคิด & หลักฐาน" เพื่อเจาะลึกการให้คะแนนและเหตุผลของแต่ละโมเดล
                        </p>
                    </div>

                    <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-full self-start sm:self-auto">
                        ตรวจเสร็จแล้ว {attempts.filter(a => a.gradingStatus === 'completed').length} / {attempts.length} คน
                    </span>
                </div>

                {attempts.length === 0 ? (
                    <div className="p-10 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        ยังไม่มีนักเรียนส่งคำตอบในห้องสอบนี้ รอให้นักเรียนเข้าสอบผ่านลิงก์ด้านบน
                    </div>
                ) : (
                    <>
                        {/* Desktop & Tablet Table View */}
                        <div className="hidden md:block w-full overflow-x-auto border border-gray-200 rounded-xl">
                            <table className="w-full min-w-[650px] text-left text-xs">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                                    <tr>
                                        <th className="p-3">นักเรียน</th>
                                        <th className="p-3">สถานะ</th>
                                        <th className="p-3">คำตอบของนักเรียน</th>
                                        {models.map((m, mIdx) => (
                                            <th key={mIdx} className="p-3 whitespace-nowrap">{m.label}</th>
                                        ))}
                                        <th className="p-3 text-right">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attempts.map((att, aIdx) => {
                                        const isCompleted = att.gradingStatus === 'completed';
                                        return (
                                            <tr key={aIdx} className="hover:bg-gray-50/70 transition">
                                                <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">
                                                    {att.studentInfo?.firstName || att.student?.firstName || 'นักเรียน'} {att.studentInfo?.lastName || att.student?.lastName || ''}
                                                    <div className="text-[11px] text-gray-400 font-normal">{att.studentInfo?.email || att.student?.email}</div>
                                                </td>

                                                <td className="p-3 whitespace-nowrap">
                                                    {isCompleted ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium text-[11px]">
                                                            <Check size={12} /> ตรวจเสร็จแล้ว
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium text-[11px] animate-pulse">
                                                            <Clock size={12} /> กำลังตรวจ...
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-3 text-gray-700 max-w-xs truncate" title={att.answers?.[0]?.selectedAnswer}>
                                                    {att.answers?.[0]?.selectedAnswer || '-'}
                                                </td>

                                                {models.map((m, mIdx) => {
                                                    const evalItem = att.evaluations?.[0]?.modelEvaluations?.find(
                                                        e => e.provider === m.provider && e.model === m.model
                                                    );
                                                    return (
                                                        <td key={mIdx} className="p-3 whitespace-nowrap">
                                                            {evalItem ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                        {evalItem.totalScore} คะแนน
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                                        {evalItem.latencyMs}ms
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedStudentAttempt(att);
                                                            setModalModelTab('all');
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1 ml-auto cursor-pointer"
                                                    >
                                                        <Eye size={13} /> ดูวิธีคิด & หลักฐาน
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="block md:hidden space-y-3">
                            {attempts.map((att, aIdx) => {
                                const isCompleted = att.gradingStatus === 'completed';
                                return (
                                    <div
                                        key={aIdx}
                                        className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm text-gray-900 truncate">
                                                    {att.studentInfo?.firstName || att.student?.firstName || 'นักเรียน'} {att.studentInfo?.lastName || att.student?.lastName || ''}
                                                </h4>
                                                <div className="text-[11px] text-gray-500 font-mono truncate">{att.studentInfo?.email || att.student?.email}</div>
                                            </div>

                                            {isCompleted ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium text-[10px] shrink-0">
                                                    <Check size={11} /> ตรวจเสร็จแล้ว
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium text-[10px] shrink-0 animate-pulse">
                                                    <Clock size={11} /> กำลังตรวจ...
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200 line-clamp-2">
                                            <strong className="text-gray-900 block mb-0.5">คำตอบ:</strong>
                                            {att.answers?.[0]?.selectedAnswer || '-'}
                                        </div>

                                        <div className="space-y-1 pt-1">
                                            <span className="text-[11px] font-semibold text-gray-600 block">คะแนนแต่ละโมเดล:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {models.map((m, mIdx) => {
                                                    const evalItem = att.evaluations?.[0]?.modelEvaluations?.find(
                                                        e => e.provider === m.provider && e.model === m.model
                                                    );
                                                    return (
                                                        <span key={mIdx} className="text-[11px] px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-gray-800 flex items-center gap-1 shadow-2xs">
                                                            <span className="font-medium text-gray-600">{m.label}:</span>
                                                            <strong className="text-indigo-600 font-bold">{evalItem?.totalScore ?? '-'}</strong>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedStudentAttempt(att);
                                                setModalModelTab('all');
                                            }}
                                            className="w-full py-2 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                        >
                                            <Eye size={14} /> ดูวิธีคิด & หลักฐาน
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Deep-Dive Student Reasoning & Evidence Modal */}
            {selectedStudentAttempt && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-gray-100">
                        {/* Modal Header */}
                        <div className="p-4 sm:px-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-indigo-50/40 flex items-center justify-between gap-3 shrink-0">
                            <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap text-[10px] sm:text-xs">
                                    <span className="font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                                        Deep-Dive AI Evaluation
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-500">
                                        ส่งเมื่อ {new Date(selectedStudentAttempt.submittedAt).toLocaleString('th-TH')}
                                    </span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                                    ผลการตรวจเจาะลึก: {selectedStudentAttempt.studentInfo?.firstName} {selectedStudentAttempt.studentInfo?.lastName}
                                </h3>
                                <p className="text-[11px] text-gray-500 truncate">
                                    อีเมล: {selectedStudentAttempt.studentInfo?.email || '-'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedStudentAttempt(null)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition shrink-0 cursor-pointer"
                                title="ปิดหน้าต่าง"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                            {/* Student Submitted Answer Box */}
                            <div className="bg-indigo-50/60 rounded-xl p-3.5 sm:p-4 border border-indigo-100 space-y-1.5">
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                        <FileText size={14} className="text-indigo-600" />
                                        คำตอบที่นักเรียนส่ง:
                                    </span>
                                    <span className="text-[11px] text-indigo-600 font-medium">
                                        {selectedStudentAttempt.answers?.[0]?.selectedAnswer?.length || 0} ตัวอักษร
                                    </span>
                                </div>
                                <div className="text-xs sm:text-sm text-gray-900 leading-relaxed bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs whitespace-pre-wrap font-sans">
                                    {selectedStudentAttempt.answers?.[0]?.selectedAnswer || '(ไม่ได้ระบุข้อความคำตอบ)'}
                                </div>
                            </div>

                            {/* View Mode & Model Switcher Tabs */}
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-200 pb-2.5">
                                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                        <Sparkles size={15} className="text-indigo-600" />
                                        วิธีคิดและเหตุผลการให้/ตัดคะแนนรายโมเดล:
                                    </h4>

                                    {/* Tabs */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                                        <button
                                            type="button"
                                            onClick={() => setModalModelTab('all')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${modalModelTab === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            🔀 เทียบทุกโมเดล ({selectedStudentAttempt.evaluations?.[0]?.modelEvaluations?.length || 0})
                                        </button>

                                        {selectedStudentAttempt.evaluations?.[0]?.modelEvaluations?.map((m, mIdx) => (
                                            <button
                                                key={mIdx}
                                                type="button"
                                                onClick={() => setModalModelTab(m.model)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${modalModelTab === m.model ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                <span>{m.label}</span>
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${modalModelTab === m.model ? 'bg-indigo-800 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                    {m.totalScore}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Models Cards Container */}
                                {(() => {
                                    const allModels = selectedStudentAttempt.evaluations?.[0]?.modelEvaluations || [];
                                    const displayedModels = modalModelTab === 'all'
                                        ? allModels
                                        : allModels.filter(m => m.model === modalModelTab);

                                    const isSingleView = displayedModels.length === 1;

                                    return (
                                        <div className={`grid gap-4 ${isSingleView ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
                                            {displayedModels.map((mEval, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-gray-200 shadow-xs space-y-3.5 flex flex-col justify-between hover:border-indigo-300 transition"
                                                >
                                                    <div className="space-y-3">
                                                        {/* Model Card Header */}
                                                        <div className="flex items-start justify-between border-b border-gray-100 pb-2.5 gap-2">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${mEval.provider === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                                        {mEval.provider}
                                                                    </span>
                                                                    <h5 className="font-bold text-sm text-gray-900 truncate" title={mEval.label}>{mEval.label}</h5>
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 font-mono block mt-0.5 truncate" title={mEval.model}>{mEval.model}</span>
                                                            </div>

                                                            <div className="text-right shrink-0">
                                                                <div className="text-xl font-black text-indigo-600">
                                                                    {mEval.totalScore} <span className="text-xs font-semibold text-gray-400">/ {questionPoints}</span>
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 justify-end mt-0.5">
                                                                    <Clock size={11} /> {mEval.latencyMs} ms
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* AI Overall Thought Process & Feedback */}
                                                        {mEval.feedback && (
                                                            <div className="space-y-1">
                                                                <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                                                    💡 วิธีคิดและข้อคิดเห็นภาพรวมของ AI:
                                                                </span>
                                                                <div className="text-xs text-gray-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/80 leading-relaxed space-y-1.5">
                                                                    {mEval.feedback.split(/\s*\|\s*|\n\n+/).filter(Boolean).map((fbChunk, cIdx) => (
                                                                        <div key={cIdx} className="bg-white/90 p-2 rounded-lg border border-indigo-100/60 shadow-2xs">
                                                                            {fbChunk}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Rubric Criteria Breakdown with Correct maxScore */}
                                                        {mEval.rubricScores && mEval.rubricScores.length > 0 && (
                                                            <div className="space-y-2.5 pt-1">
                                                                <span className="text-xs font-bold text-gray-800 block">
                                                                    📋 เกณฑ์ Rubric, เหตุผลการให้/ตัดคะแนน & หลักฐาน:
                                                                </span>

                                                                <div className="space-y-2.5">
                                                                    {mEval.rubricScores.map((rub, rIdx) => {
                                                                        const criterionDef = session.questions?.[0]?.aiGrading?.rubricCriteria?.find(c => c.rubricId === rub.rubricId);
                                                                        const criterionTitle = criterionDef?.title || `เกณฑ์ที่ ${rIdx + 1}`;
                                                                        const criterionMaxScore = Number(criterionDef?.maxScore) || Number(rub.maxScore) || 1;
                                                                        const isFullScore = rub.score >= criterionMaxScore;
                                                                        const isZero = rub.score === 0;

                                                                        return (
                                                                            <div
                                                                                key={rIdx}
                                                                                className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${isFullScore ? 'bg-emerald-50/40 border-emerald-200' : isZero ? 'bg-red-50/40 border-red-200' : 'bg-amber-50/40 border-amber-200'}`}
                                                                            >
                                                                                <div className="flex justify-between items-start gap-2">
                                                                                    <div>
                                                                                        <span className="font-bold text-xs text-gray-900">
                                                                                            {criterionTitle}
                                                                                        </span>
                                                                                        {criterionDef?.description && (
                                                                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                                                                {criterionDef.description}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>

                                                                                    <span className={`font-black px-2 py-0.5 rounded-full text-[11px] shrink-0 ${isFullScore ? 'bg-emerald-100 text-emerald-800' : isZero ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                                        {rub.score} / {criterionMaxScore} คะแนน
                                                                                    </span>
                                                                                </div>

                                                                                {/* Rationale explanation */}
                                                                                {rub.feedback && (
                                                                                    <div className="text-gray-800 text-xs leading-relaxed bg-white p-2.5 rounded-lg border border-gray-200/70 shadow-2xs">
                                                                                        <strong className="text-gray-900 block mb-0.5">คำอธิบายและเหตุผล:</strong>
                                                                                        <div className="whitespace-pre-wrap">{rub.feedback}</div>
                                                                                    </div>
                                                                                )}

                                                                                {/* Evidence extracted quote */}
                                                                                {rub.evidence ? (
                                                                                    <div className="text-[11px] text-emerald-900 bg-emerald-100/70 p-2 rounded-lg border border-emerald-200">
                                                                                        <span className="font-bold block text-emerald-950 mb-0.5">🔎 หลักฐานที่ AI ตรวจพบในคำตอบ:</span>
                                                                                        "{rub.evidence}"
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-[11px] text-gray-400 italic">
                                                                                        (ไม่พบข้อความหลักฐานที่สนับสนุนในคำตอบของนักเรียน)
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Card Footer */}
                                                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                                                        <span>Tokens: {mEval.inputTokens || 0} in / {mEval.outputTokens || 0} out</span>
                                                        <span className="font-bold text-indigo-600">Confidence: {((mEval.confidence || 1) * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 sm:px-6 border-t border-gray-100 bg-gray-50/60 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedStudentAttempt(null)}
                                className="px-5 py-2 text-xs font-bold bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl transition shadow-2xs cursor-pointer"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Full Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 border border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-base text-gray-900">QR Code เข้าห้องสอบ</h3>
                            <button
                                type="button"
                                onClick={() => setShowQrModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <QRCodeSVG value={liveStudentUrl} size={200} level="H" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-gray-500 font-medium">รหัส PIN</div>
                            <div className="text-2xl font-black font-mono text-indigo-700 tracking-widest">{session.shortCode}</div>
                        </div>

                        <p className="text-xs text-gray-500">ให้นักเรียนสแกน QR Code นี้เพื่อเข้าห้องสอบจำลองได้ทันที</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestAIExamSessionResult;
