import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { useDialog } from '../../components/DialogProvider';
import { ArrowLeft, Clock, FileText, CheckCircle, Pencil, Play, History, Users, Shield, TrendingUp, ChevronRight, Trash2, ListChecks } from 'lucide-react';

const ExamDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useDialog();
    const [exam, setExam] = useState(null);
    const [historyPreview, setHistoryPreview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = getConfig();
                const { data } = await api.get(`/exams/${id}`, config);
                setExam(data);

                // Fetch exam history (preview last 3)
                try {
                    const historyRes = await api.get(`/exam-sessions/${id}/history`, config);
                    setHistoryPreview(historyRes.data.slice(0, 3));
                } catch (e) {
                    // No history is fine
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch exam');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleDeleteSession = async (sessionId) => {
        const ok = await showConfirm({
            title: 'ลบประวัติการสอบ',
            message: 'คุณต้องการลบประวัติการสอบนี้หรือไม่?\nข้อมูลการสอบ คะแนน และประวัติการทุจริตทั้งหมดจะถูกลบถาวร',
            confirmText: 'ลบ',
            variant: 'danger',
        });
        if (!ok) return;

        try {
            await api.delete(`/exam-sessions/${sessionId}`);
            const historyRes = await api.get(`/exam-sessions/${id}/history`);
            setHistoryPreview(historyRes.data.slice(0, 3));
        } catch (err) {
            await showAlert({
                title: 'เกิดข้อผิดพลาด',
                message: 'ลบข้อมูลไม่สำเร็จ: ' + (err.response?.data?.message || err.message),
                variant: 'danger',
            });
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!exam) return null;

    const totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => {
                        if (exam.category && exam.category._id) {
                            navigate(`/teacher/exams/category/${exam.category._id}`);
                        } else {
                            navigate('/teacher/exams');
                        }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{exam.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">{exam.examId}</span>
                        <div className="flex items-center gap-1"><Clock size={14} /> {exam.durationMin} นาที</div>
                        <div className="flex items-center gap-1"><FileText size={14} /> {exam.questions.length} ข้อ</div>
                        <div className="flex items-center gap-1"><CheckCircle size={14} /> {totalPoints} คะแนน</div>
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/teacher/exams/${exam._id}/session`)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition text-sm"
                >
                    <Play size={16} /> เริ่มสอบ
                </button>
                <button
                    onClick={() => navigate(`/teacher/exams/${exam._id}/edit`)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center gap-2 transition text-sm"
                >
                    <Pencil size={16} /> แก้ไข
                </button>
            </div>

            {/* Exam History Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <History size={20} /> ประวัติการสอบล่าสุด
                    </h2>
                    <button
                        onClick={() => navigate(`/teacher/exams/${id}/history`)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                        ดูทั้งหมด <ChevronRight size={16} />
                    </button>
                </div>

                {historyPreview.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">ยังไม่มีประวัติการสอบ</p>
                ) : (
                    <div className="space-y-3">
                        {historyPreview.map((s) => (
                            <div key={s._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span className="font-medium text-gray-900 text-sm">
                                                {formatDate(s.startedAt)}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {s.status === 'active' ? 'กำลังสอบ' : 'สิ้นสุดแล้ว'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Users size={12} /> {s.studentCount} คน</span>
                                            <span className="flex items-center gap-1"><CheckCircle size={12} /> ส่งแล้ว {s.submittedCount}</span>
                                            {s.status === 'ended' && (
                                                <span className="flex items-center gap-1"><TrendingUp size={12} /> เฉลี่ย {s.avgScore}%</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {s.status === 'active' && (
                                            <button
                                                onClick={() => navigate(`/teacher/exams/${id}/session`)}
                                                className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium hover:bg-green-100 transition"
                                            >
                                                เข้าห้องสอบ
                                            </button>
                                        )}
                                        <button
                                            onClick={() => navigate(`/teacher/exams/${id}/monitor?sessionId=${s._id}`)}
                                            className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200 transition"
                                        >
                                            ดูผลสอบ/ทุจริต
                                        </button>
                                        <button
                                            onClick={() => navigate(`/teacher/exams/${id}/attempts?sessionId=${s._id}`)}
                                            className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition flex items-center gap-1"
                                            title="ดูรายการส่งคำตอบ"
                                        >
                                            <ListChecks size={14} /> รายการส่ง
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSession(s._id)}
                                            className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 transition flex items-center justify-center"
                                            title="ลบประวัติ"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Questions */}
            <div className="space-y-4">
                {exam.questions.map((q, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900 mb-2">
                                    ข้อ {index + 1}.
                                </h3>
                                <div 
                                    className="prose prose-sm max-w-none text-gray-900"
                                    dangerouslySetInnerHTML={{ __html: q.prompt }}
                                />
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                {q.points} คะแนน
                            </span>
                        </div>

                        <div className="space-y-2 ml-2">
                            {q.choices.map((choice) => (
                                <div
                                    key={choice.value}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${choice.value === q.correctAnswer
                                        ? 'bg-green-50 border border-green-200 text-green-800'
                                        : 'bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <span className="font-medium w-6">{choice.value.toUpperCase()}.</span>
                                    <span>{choice.label}</span>
                                    {choice.value === q.correctAnswer && (
                                        <CheckCircle size={16} className="text-green-600 ml-auto flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExamDetail;
