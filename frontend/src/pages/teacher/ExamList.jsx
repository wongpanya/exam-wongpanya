import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { Trash2, Eye, PlusCircle, Clock, FileText, Pencil } from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';

const ExamList = () => {
    const navigate = useNavigate();
    const { showConfirm } = useDialog();
    const [exams, setExams] = useState([]);
    const [categories, setCategories] = useState(['ทั้งหมด']);
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchExamsAndCategories = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const [examsRes, categoriesRes] = await Promise.all([
                api.get('/exams', config),
                api.get('/exams/categories', config)
            ]);

            setExams(examsRes.data);
            const cats = Array.from(new Set(['ทั้งหมด', 'ทั่วไป', ...categoriesRes.data]));
            setCategories(cats);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch exams');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExamsAndCategories();
    }, []);

    const handleDelete = async (id) => {
        const ok = await showConfirm({ title: 'ลบข้อสอบ', message: 'คุณต้องการลบข้อสอบนี้ใช่หรือไม่?', confirmText: 'ลบ', variant: 'danger' });
        if (!ok) return;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            await api.delete(`/exams/${id}`, config);
            setExams(exams.filter((exam) => exam._id !== id));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete exam');
        }
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">รายการข้อสอบ</h1>
                    <p className="text-gray-500 mt-1">ข้อสอบทั้งหมดที่คุณสร้าง ({exams.length} ชุด)</p>
                </div>
                <button
                    onClick={() => navigate('/teacher/exams/create')}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition text-sm"
                >
                    <PlusCircle size={18} /> สร้างข้อสอบใหม่
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {exams.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อข้อสอบ หรือรหัสข้อสอบ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-sm font-medium text-gray-500 flex-shrink-0">หมวดหมู่:</span>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {exams.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-700">ยังไม่มีข้อสอบ</h3>
                    <p className="text-gray-500 mt-1">คลิก &quot;สร้างข้อสอบใหม่&quot; เพื่อเริ่มต้น</p>
                </div>
            ) : (() => {
                const filteredExams = exams.filter((exam) => {
                    const matchesSearch = 
                        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        exam.examId.toLowerCase().includes(searchQuery.toLowerCase());
                    
                    const examCategory = exam.category || 'ทั่วไป';
                    const matchesCategory = 
                        selectedCategory === 'ทั้งหมด' || 
                        examCategory === selectedCategory;

                    return matchesSearch && matchesCategory;
                });

                if (filteredExams.length === 0) {
                    return (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                            <h3 className="text-lg font-semibold text-gray-700">ไม่พบข้อสอบ</h3>
                            <p className="text-gray-500 mt-1">ไม่พบข้อสอบที่ตรงตามคำค้นหาหรือตัวกรองหมวดหมู่</p>
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredExams.map((exam) => (
                            <div
                                key={exam._id}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden"
                            >
                                <div className="p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {exam.examId}
                                                </span>
                                                <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                                                    {exam.category || 'ทั่วไป'}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 mt-1 truncate">
                                                {exam.title}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <FileText size={14} />
                                            <span>{exam.questions.length} ข้อ</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={14} />
                                            <span>{exam.durationMin} นาที</span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-400">
                                        สร้างเมื่อ: {new Date(exam.createdAt).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex justify-end gap-2">
                                    <button
                                        onClick={() => navigate(`/teacher/exams/${exam._id}`)}
                                        className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center gap-1"
                                    >
                                        <Eye size={14} /> ดูรายละเอียด
                                    </button>
                                    <button
                                        onClick={() => navigate(`/teacher/exams/${exam._id}/edit`)}
                                        className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition flex items-center gap-1"
                                    >
                                        <Pencil size={14} /> แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDelete(exam._id)}
                                        className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                                    >
                                        <Trash2 size={14} /> ลบ
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
};

export default ExamList;
