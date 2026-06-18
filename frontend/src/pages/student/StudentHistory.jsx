import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';

const StudentHistory = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const { data } = await api.get('/users/me/history', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setHistory(data);
            } catch (err) {
                console.error('Failed to fetch history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const formatDateTime = (ts) => {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' +
            d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

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

    if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดประวัติการสอบ...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/student')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="text-indigo-600" size={28} />
                    ประวัติการสอบ
                </h1>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">วิชา/ข้อสอบ</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">สถานะ</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">คะแนน</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">เวลาที่ส่ง</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        ยังไม่มีประวัติการสอบ
                                    </td>
                                </tr>
                            ) : (
                                history.map((attempt) => (
                                    <tr key={attempt._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{attempt.exam?.title || 'ข้อสอบที่ถูกลบ'}</p>
                                            <p className="text-xs text-gray-500">เวลาทำข้อสอบ: {attempt.exam?.durationMin || '-'} นาที</p>
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
                                            {formatDateTime(attempt.submittedAt || attempt.createdAt)}
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

export default StudentHistory;
