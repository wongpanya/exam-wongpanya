
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { useDialog } from '../../components/DialogProvider';
import { ArrowLeft, Clock, Calendar, Users, CheckCircle, TrendingUp, ChevronRight, Shield, AlertTriangle, Trash2, FileText, ListChecks } from 'lucide-react';

const ExamHistory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useDialog();
    const [history, setHistory] = useState([]);
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const config = getConfig();
                const [examRes, historyRes] = await Promise.all([
                    api.get(`/exams/${id}`, config),
                    api.get(`/exam-sessions/${id}/history`, config)
                ]);
                setExam(examRes.data);
                setHistory(historyRes.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
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
            setHistory(prev => prev.filter(s => s._id !== sessionId));
        } catch (err) {
            await showAlert({
                title: 'เกิดข้อผิดพลาด',
                message: 'ลบข้อมูลไม่สำเร็จ: ' + (err.response?.data?.message || err.message),
                variant: 'danger',
            });
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(`/teacher/exams/${id}`)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ประวัติการสอบ</h1>
                    <p className="text-gray-500 text-sm">{exam?.title}</p>
                </div>
            </div>

            <div className="space-y-4">
                {history.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <Calendar className="mx-auto text-gray-300 mb-2" size={48} />
                        <p className="text-gray-500">ยังไม่มีประวัติการสอบ</p>
                    </div>
                ) : (
                    history.map((session) => (
                        <div
                            key={session._id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition cursor-pointer"
                            onClick={() => {
                                // If active, go to session. If ended, go to monitor (which serves as summary/history view)
                                if (session.status === 'active') {
                                    navigate(`/teacher/exams/${id}/session`);
                                } else {
                                    navigate(`/teacher/exams/${id}/monitor?sessionId=${session._id}`);
                                }
                            }}
                        >
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${session.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                        <h3 className="font-semibold text-lg text-gray-900">
                                            {formatDate(session.startedAt)}
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <Users size={16} />
                                            <span>{session.studentCount} คน</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle size={16} />
                                            <span>ส่งแล้ว {session.submittedCount}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <TrendingUp size={16} />
                                            <span>เฉลี่ย {session.avgScore}%</span>
                                        </div>
                                        {session.cheatEvents > 0 && (
                                            <div className="flex items-center gap-1.5 text-red-500 font-medium">
                                                <Shield size={16} />
                                                <span>ทุจริต {session.cheatEvents}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 mt-4 sm:mt-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/teacher/exams/${id}/attempts?sessionId=${session._id}`);
                                        }}
                                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-2 text-sm font-medium"
                                        title="รายการส่งคำตอบ"
                                    >
                                        <ListChecks size={18} />
                                        <span className="hidden sm:inline">รายการส่ง</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // If active, go to session. If ended, go to monitor (which serves as summary/history view)
                                            if (session.status === 'active') {
                                                navigate(`/teacher/exams/${id}/session`);
                                            } else {
                                                navigate(`/teacher/exams/${id}/monitor?sessionId=${session._id}`);
                                            }
                                        }}
                                        className="text-gray-600 hover:text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline"
                                    >
                                        {session.status === 'active' ? 'ไปหน้าสอบ' : 'ดูรายละเอียด'} <ChevronRight size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSession(session._id);
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="ลบประวัติ"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ExamHistory;
