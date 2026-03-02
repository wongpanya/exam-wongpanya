import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../config/api';
import { ArrowLeft, Search, Download, Clock, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';

const ExamAttempts = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const sessionId = queryParams.get('sessionId');

    const [attempts, setAttempts] = useState([]);
    const [examDetails, setExamDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch exam details for item analysis
                const examRes = await api.get(`/exams/${id}`, getConfig());
                setExamDetails(examRes.data);

                const url = sessionId
                    ? `/exam-sessions/${id}/attempts?sessionId=${sessionId}`
                    : `/exam-sessions/${id}/attempts`;
                const { data } = await api.get(url, getConfig());
                // Sort by submittedAt desc, then startedAt desc
                const sorted = data.sort((a, b) => {
                    if (a.submittedAt && b.submittedAt) return new Date(b.submittedAt) - new Date(a.submittedAt);
                    if (a.submittedAt) return -1;
                    if (b.submittedAt) return 1;
                    return new Date(b.startedAt) - new Date(a.startedAt);
                });
                setAttempts(sorted);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, sessionId]);

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

    const handleDownloadCSV = () => {
        if (attempts.length === 0) return;

        // Define base CSV headers
        const baseHeaders = ['ชื่อ', 'นามสกุล', 'อีเมล', 'สถานะ', 'คะแนน', 'คะแนนเต็ม', 'เวลาที่ใช้', 'ส่งเมื่อ'];
        
        // Add question headers if exam details are available
        const questionHeaders = examDetails?.questions?.map((q, i) => `ข้อ ${i + 1} (${q.points} คะแนน)`) || [];
        const headers = [...baseHeaders, ...questionHeaders];

        // Map data to CSV rows
        const rows = attempts.map(a => {
            const statusText = a.status === 'submitted' ? 'ส่งแล้ว' : a.status === 'suspended' ? 'ถูกระงับ' : 'กำลังทำ';
            const duration = getDuration(a.startedAt, a.submittedAt);
            const submittedAt = a.submittedAt ? new Date(a.submittedAt).toLocaleString('th-TH') : '-';
            
            const baseRow = [
                `"${a.student.firstName}"`,
                `"${a.student.lastName}"`,
                `"${a.student.email}"`,
                `"${statusText}"`,
                a.score !== null ? a.score : '-',
                a.totalPoints,
                `"${duration}"`,
                `"${submittedAt}"`
            ];

            // Add question answers (1 for correct, 0 for incorrect, - for unanswered)
            const questionAnswers = examDetails?.questions?.map(q => {
                const studentAnswer = a.answers?.find(ans => ans.questionId === q.questionId);
                if (!studentAnswer || !studentAnswer.selectedAnswer) return '-';
                return studentAnswer.selectedAnswer === q.correctAnswer ? '1' : '0';
            }) || [];

            return [...baseRow, ...questionAnswers].join(',');
        });

        // Combine headers and rows
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Add BOM for UTF-8 encoding (helps Excel read Thai characters correctly)
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `exam_results_${id}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredAttempts = attempts.filter(a =>
        a.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'submitted':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> ส่งแล้ว</span>;
            case 'suspended':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><XCircle size={12} /> ถูกระงับ</span>;
            default:
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Clock size={12} /> กำลังทำ</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading attempts...</div>;

    return (
        <div className="space-y-6 container mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(sessionId ? `/teacher/exams/${id}/history` : `/teacher/exams/${id}/session`)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="text-indigo-600" size={28} />
                        รายการการส่งคำตอบ
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ หรืออีเมล..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                        />
                    </div>
                    <button
                        onClick={handleDownloadCSV}
                        disabled={attempts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">ดาวน์โหลด CSV</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">นักเรียนทั้งหมด</p>
                    <p className="text-2xl font-bold text-gray-900">{attempts.length} คน</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">ส่งแล้ว</p>
                    <p className="text-2xl font-bold text-green-600">{attempts.filter(a => a.status === 'submitted').length} คน</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">คะแนนเฉลี่ย</p>
                    <p className="text-2xl font-bold text-indigo-600">
                        {attempts.length > 0
                            ? (attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length).toFixed(1)
                            : 0}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">นักเรียน</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">สถานะ</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">คะแนน</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">เวลาที่ใช้</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">ส่งเมื่อ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAttempts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">ไม่พบข้อมูล</td>
                                </tr>
                            ) : (
                                filteredAttempts.map((attempt) => (
                                    <tr key={attempt._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                    {attempt.student.firstName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{attempt.student.firstName} {attempt.student.lastName}</p>
                                                    <p className="text-xs text-gray-500">{attempt.student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(attempt.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {attempt.score !== null ? (
                                                <span className="font-bold text-gray-900">{attempt.score} <span className="text-gray-400 text-xs font-normal">/ {attempt.totalPoints}</span></span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {getDuration(attempt.startedAt, attempt.submittedAt)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDateTime(attempt.submittedAt)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExamAttempts;
