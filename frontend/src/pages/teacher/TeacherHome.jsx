import { Users, FileText, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TeacherHome = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">ภาพรวมระบบสอบ</p>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button
                        onClick={() => navigate('/teacher/students')}
                        className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 border border-gray-200 transition text-left"
                    >
                        <Users className="text-indigo-600 mr-3 flex-shrink-0" size={20} />
                        <div>
                            <p className="font-medium text-gray-900">นักเรียนทั้งหมด</p>
                            <p className="text-sm text-gray-500">ดูรายชื่อนักเรียนในระบบ</p>
                        </div>
                    </button>
                    <button
                        onClick={() => navigate('/teacher/exams')}
                        className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 border border-gray-200 transition text-left"
                    >
                        <FileText className="text-indigo-600 mr-3 flex-shrink-0" size={20} />
                        <div>
                            <p className="font-medium text-gray-900">รายการข้อสอบ</p>
                            <p className="text-sm text-gray-500">ดูข้อสอบที่สร้างไว้</p>
                        </div>
                    </button>
                    <button
                        onClick={() => navigate('/teacher/exams/create')}
                        className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-green-50 hover:border-green-200 border border-gray-200 transition text-left"
                    >
                        <PlusCircle className="text-green-600 mr-3 flex-shrink-0" size={20} />
                        <div>
                            <p className="font-medium text-gray-900">สร้างข้อสอบใหม่</p>
                            <p className="text-sm text-gray-500">สร้างข้อสอบชุดใหม่</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeacherHome;
