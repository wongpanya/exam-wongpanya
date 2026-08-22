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
    CheckCheck
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
            fetchSessionResults(false);
        }, 4000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleToggleSessionStatus = async () => {
        try {
            await api.patch(`/grading/test-sessions/${sessionId}/end`);
            fetchSessionResults(true);
        } catch (err) {
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
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 text-sm">กำลังโหลดข้อมูลผลการทดสอบ Session...</p>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">ไม่พบข้อมูลห้องสอบจำลอง</h2>
                <p className="text-sm text-gray-600">{error}</p>
                <Link
                    to="/teacher/test-ai-exam"
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
                >
                    <ArrowLeft size={16} /> กลับสู่หน้าห้องทดลอง
                </Link>
            </div>
        );
    }

    const { session, attempts, aggregateInsights } = data;
    const models = session.modelsToCompare || [];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link
                            to="/teacher/test-ai-exam"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition"
                        >
                            <ArrowLeft size={14} /> ห้องทดลองข้อสอบ
                        </Link>
                        <span className="text-gray-300">/</span>
                        <span className="text-xs font-semibold text-indigo-600">ผลการทดสอบ Session</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
                    <p className="text-xs text-gray-500">
                        สร้างเมื่อ {new Date(session.createdAt).toLocaleString('th-TH')} • เปรียบเทียบ {models.length} โมเดล
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => fetchSessionResults(true)}
                        disabled={refreshing}
                        className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        รีเฟรช
                    </button>

                    <button
                        type="button"
                        onClick={exportToExcel}
                        className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    >
                        <FileSpreadsheet size={15} /> ส่งออก Excel
                    </button>

                    <button
                        type="button"
                        onClick={handleToggleSessionStatus}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 ${session.status === 'active' ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
                    >
                        {session.status === 'active' ? 'ปิดห้องสอบ' : 'เปิดห้องสอบใหม่'}
                    </button>

                    <button
                        type="button"
                        onClick={handleDeleteSession}
                        className="px-3 py-2 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl transition flex items-center gap-1 shadow-sm"
                        title="ลบ Session นี้ถาวร"
                    >
                        <Trash2 size={14} /> ลบ Session
                    </button>
                </div>
            </div>

            {/* Session Join Banner Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${session.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                            {session.status === 'active' ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> : null}
                            {session.status === 'active' ? 'ห้องสอบกำลังเปิดอยู่ (Active)' : 'ห้องสอบปิดแล้ว (Ended)'}
                        </span>
                        <span className="text-xs text-gray-400">ส่งคำตอบแล้ว {attempts.length} คน</span>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-600">ลิงก์เข้าสอบสำหรับนักเรียน:</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="text"
                                readOnly
                                value={liveStudentUrl}
                                className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-indigo-900 font-mono select-all outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shrink-0 flex items-center gap-1 shadow-sm"
                            >
                                {copiedLink ? <CheckCheck size={13} /> : <Copy size={13} />}
                                {copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                        <div>
                            <span className="text-xs text-gray-500">รหัส PIN 6 หลัก:</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-2xl font-black font-mono text-indigo-700 tracking-wider">
                                    {session.shortCode}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyPin}
                                    className="p-1 text-gray-400 hover:text-indigo-600 transition"
                                    title="คัดลอก PIN"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5 self-end mb-1"
                        >
                            <Share2 size={13} /> ขยาย QR Code
                        </button>
                    </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <QRCodeSVG value={liveStudentUrl} size={100} level="M" />
                    <span className="text-[10px] font-medium text-gray-500 mt-2">สแกนเพื่อเข้าสอบทันที</span>
                </div>
            </div>

            {/* Aggregated Model Performance Summary Cards */}
            {aggregateInsights && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 size={17} className="text-indigo-600" />
                            สรุปภาพรวมเปรียบเทียบโมเดล AI ใน Session นี้ ({attempts.length} นักเรียน)
                        </h2>
                    </div>

                    {/* Model KPI Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {aggregateInsights.modelSummaries?.map((mStat, idx) => {
                            const isFastest = aggregateInsights.fastestModel?.model === mStat.model;
                            const isHighestScore = aggregateInsights.highestScoringModel?.model === mStat.model;
                            const isHighestQuality = aggregateInsights.highestQualityModel?.model === mStat.model;

                            return (
                                <div
                                    key={idx}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${mStat.provider === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                {mStat.provider}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {mStat.averageLatencyMs} ms
                                            </span>
                                        </div>
                                        <div className="font-bold text-sm text-gray-900">{mStat.label}</div>
                                        <div className="text-[10px] text-gray-400 font-mono truncate">{mStat.model}</div>
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
                                                {mStat.averageScore} <span className="text-xs font-normal text-gray-400">/ {session.questions?.[0]?.points || 5}</span>
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

            {/* Per-Student Submissions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-3 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                    <div className="p-12 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        ยังไม่มีนักเรียนส่งคำตอบในห้องสอบนี้ รอให้นักเรียนเข้าสอบผ่านลิงก์ด้านบน
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-xs">
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
                                                    onClick={() => setSelectedStudentAttempt(att)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1 ml-auto"
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
                )}
            </div>

            {/* Deep-Dive Student Reasoning & Evidence Modal */}
            {selectedStudentAttempt && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-600" />
                                    ผลการตรวจเจาะลึก: {selectedStudentAttempt.studentInfo?.firstName} {selectedStudentAttempt.studentInfo?.lastName}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    ส่งเมื่อ {new Date(selectedStudentAttempt.submittedAt).toLocaleString('th-TH')} • อีเมล {selectedStudentAttempt.studentInfo?.email}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedStudentAttempt(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                            {/* Student Answer Box */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                                <span className="text-xs font-bold text-gray-700">คำตอบที่นักเรียนส่ง:</span>
                                <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-100">
                                    {selectedStudentAttempt.answers?.[0]?.selectedAnswer || '(ไม่ได้ระบุข้อความคำตอบ)'}
                                </div>
                            </div>

                            {/* Side-by-Side Model Reasoning & Rubric Cards */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <Sparkles size={14} className="text-indigo-600" />
                                        เปรียบเทียบวิธีคิด เหตุผลการให้คะแนน และการตัดคะแนนของแต่ละโมเดล:
                                    </h4>
                                    <span className="text-[11px] text-gray-500">เปรียบเทียบ {selectedStudentAttempt.evaluations?.[0]?.modelEvaluations?.length || 0} โมเดล</span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedStudentAttempt.evaluations?.[0]?.modelEvaluations?.map((mEval, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-300 transition"
                                        >
                                            <div className="space-y-3">
                                                {/* Header */}
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${mEval.provider === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                                {mEval.provider}
                                                            </span>
                                                            <span className="font-bold text-sm text-gray-900">{mEval.label}</span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-mono">{mEval.model}</span>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-xl font-black text-indigo-600">
                                                            {mEval.totalScore} <span className="text-xs font-normal text-gray-400">/ {session.questions?.[0]?.points || 5}</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 justify-end mt-0.5">
                                                            <Clock size={11} /> {mEval.latencyMs} ms
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Reasoning / Feedback Overview */}
                                                {mEval.feedback && (
                                                    <div className="space-y-1">
                                                        <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                                                            💡 วิธีคิดและข้อคิดเห็นภาพรวมของ AI:
                                                        </span>
                                                        <div className="text-xs text-gray-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 leading-relaxed whitespace-pre-wrap">
                                                            {mEval.feedback}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Rubric Breakdown with Evidence & Deduction */}
                                                {mEval.rubricScores && mEval.rubricScores.length > 0 && (
                                                    <div className="space-y-2 pt-1">
                                                        <span className="text-[11px] font-bold text-gray-700">
                                                            เกณฑ์ Rubric, เหตุผลที่ให้/ตัดคะแนน & หลักฐาน:
                                                        </span>
                                                        {mEval.rubricScores.map((rub, rIdx) => {
                                                            const isFullScore = rub.score >= (rub.maxScore || 1);
                                                            const isZero = rub.score === 0;
                                                            return (
                                                                <div
                                                                    key={rIdx}
                                                                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${isFullScore ? 'bg-emerald-50/40 border-emerald-200/80' : isZero ? 'bg-red-50/40 border-red-200/80' : 'bg-amber-50/40 border-amber-200/80'}`}
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-bold text-gray-900">
                                                                            {session.questions?.[0]?.aiGrading?.rubricCriteria?.find(c => c.rubricId === rub.rubricId)?.title || `เกณฑ์ที่ ${rIdx + 1}`}
                                                                        </span>
                                                                        <span className={`font-black px-2 py-0.5 rounded-full text-xs ${isFullScore ? 'bg-emerald-100 text-emerald-800' : isZero ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                            {rub.score} / {rub.maxScore || session.questions?.[0]?.points || 5} คะแนน
                                                                        </span>
                                                                    </div>

                                                                    {/* Rationale explanation */}
                                                                    {rub.feedback && (
                                                                        <p className="text-gray-700 text-xs leading-relaxed bg-white/80 p-2.5 rounded-lg border border-gray-100">
                                                                            <strong className="text-gray-800">คำอธิบายเหตุผล:</strong> {rub.feedback}
                                                                        </p>
                                                                    )}

                                                                    {/* Evidence extracted quote */}
                                                                    {rub.evidence ? (
                                                                        <div className="text-[11px] text-emerald-800 bg-emerald-100/60 p-2 rounded-lg border border-emerald-200/70">
                                                                            <span className="font-bold">🔎 หลักฐานที่พบในคำตอบ:</span> "{rub.evidence}"
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
                                                )}
                                            </div>

                                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                                                <span>Tokens: {mEval.inputTokens || 0} in / {mEval.outputTokens || 0} out</span>
                                                <span className="font-semibold text-indigo-600">Confidence: {((mEval.confidence || 1) * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedStudentAttempt(null)}
                                className="px-5 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Full Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-base text-gray-900">QR Code เข้าห้องสอบ</h3>
                            <button
                                type="button"
                                onClick={() => setShowQrModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <QRCodeSVG value={liveStudentUrl} size={220} level="H" />
                        </div>

                        <div className="space-y-1">
                            <span className="text-xs text-gray-500">รหัส PIN เข้าห้องสอบ</span>
                            <div className="text-3xl font-black font-mono text-indigo-700 tracking-wider">
                                {session.shortCode}
                            </div>
                        </div>

                        <p className="text-xs text-gray-500">
                            ให้นักเรียนสแกน QR Code หรือเปิดลิงก์เพื่อเข้าทำข้อสอบจำลอง
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestAIExamSessionResult;
