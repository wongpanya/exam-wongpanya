import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

const StudentHistory = () => {
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    navigate('/login');
                    return;
                }
                const { data } = await api.get('/exam-sessions/my-history', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setAttempts(data);
            } catch (err) {
                setError(err.response?.data?.message || 'ไม่สามารถดึงประวัติการสอบได้');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [navigate]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/student')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ประวัติการสอบ</h1>
                    <p className="text-gray-500 mt-1">รายการข้อสอบที่คุณได้ทำเสร็จสิ้นแล้ว</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {!loading && attempts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                    <BookOpen className="mx-auto mb-4 text-gray-300" size={48} />
                    <p className="text-lg font-medium text-gray-900">ยังไม่มีประวัติการสอบ</p>
                    <p className="text-sm mt-1">คุณยังไม่ได้ทำข้อสอบใดๆ หรือยังทำไม่เสร็จสิ้น</p>
                    <button 
                        onClick={() => navigate('/student/join')}
                        className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                    >
                        เข้าสอบตอนนี้เลย
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {attempts.map((attempt) => (
                        <div key={attempt._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition">
                            <div>
                                <div className="flex justify-between items-start gap-4">
                                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2">
                                        {attempt.exam?.title || 'ไม่พบข้อมูลข้อสอบ'}
                                    </h3>
                                    {attempt.status === 'submitted' ? (
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1">
                                            <CheckCircle size={12} /> ส่งแล้ว
                                        </span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1">
                                            <AlertTriangle size={12} /> ถูกระงับ
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                    {attempt.exam?.description}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <Clock size={16} />
                                    <span>{formatDate(attempt.endedAt || attempt.updatedAt)}</span>
                                </div>
                                
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 block mb-1">คะแนนที่ได้</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-bold ${attempt.score >= (attempt.exam?.passingScore || 0) ? 'text-green-600' : 'text-red-500'}`}>
                                            {attempt.score}
                                        </span>
                                        <span className="text-gray-400 font-medium">/{attempt.exam?.totalPoints || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentHistory;
