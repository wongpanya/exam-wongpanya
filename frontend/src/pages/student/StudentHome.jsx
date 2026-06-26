import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, BookOpen, GraduationCap, FolderOpen } from 'lucide-react';
import api from '../../config/api';

const StudentHome = () => {
    const navigate = useNavigate();
    const [joinedCategories, setJoinedCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJoinedCategories = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                };
                const { data } = await api.get('/exams/categories/my-joined', config);
                setJoinedCategories(data);
            } catch (err) {
                console.error('Failed to fetch joined categories:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchJoinedCategories();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">หน้าหลัก</h1>
                <p className="text-gray-500 mt-1">ยินดีต้อนรับเข้าสู่ระบบสอบ</p>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/student/join')}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-indigo-200 transition text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <QrCode className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">เข้าร่วมชั้นเรียน / สอบ / เช็คชื่อ</h3>
                            <p className="text-xs text-gray-500 mt-0.5">สแกน QR Code หรือกรอกรหัส 6 หลักเพื่อเข้าร่วมกิจกรรม</p>
                        </div>
                    </div>
                </button>

                <button 
                    onClick={() => navigate('/student/history')}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-indigo-200 transition text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <BookOpen className="text-gray-600" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-700">ประวัติการสอบ</h3>
                            <p className="text-xs text-gray-500 mt-0.5">ดูผลคะแนนและประวัติการสอบที่ผ่านมา</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Enrolled Categories / Subjects Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FolderOpen className="text-indigo-600" size={20} />
                    รายวิชาของฉัน ({joinedCategories.length})
                </h2>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                ) : joinedCategories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm space-y-2">
                        <p>คุณยังไม่ได้เข้าร่วมรายวิชาใด ๆ</p>
                        <button
                            onClick={() => navigate('/student/join')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                            กดที่นี่เพื่อเข้าร่วมรายวิชาแรก
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {joinedCategories.map((cat) => (
                            <div
                                key={cat._id}
                                className="p-4 border border-gray-100 rounded-xl hover:border-indigo-100 transition bg-gray-50/50 flex flex-col justify-between gap-3"
                            >
                                <div>
                                    <h3 className="font-semibold text-gray-955 text-base">{cat.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        ผู้สอน: {cat.createdBy ? `${cat.createdBy.firstName} ${cat.createdBy.lastName}` : 'ไม่ระบุ'}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                                    <span className="font-mono text-gray-400">รหัสรายวิชา: {cat.joinCode ? `${cat.joinCode.slice(0, 3)} ${cat.joinCode.slice(3)}` : '-'}</span>
                                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">เข้าร่วมแล้ว</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentHome;
