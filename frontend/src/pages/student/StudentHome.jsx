import { useNavigate } from 'react-router-dom';
import { QrCode, BookOpen } from 'lucide-react';

const StudentHome = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">หน้าหลัก</h1>
                <p className="text-gray-500 mt-1">ยินดีต้อนรับเข้าสู่ระบบสอบ</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/student/join')}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-indigo-200 transition text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <QrCode className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">สแกน QR เข้าสอบ</h3>
                            <p className="text-sm text-gray-500 mt-0.5">สแกน QR Code จากอาจารย์เพื่อเข้าทำข้อสอบ</p>
                        </div>
                    </div>
                </button>

                <button 
                    onClick={() => navigate('/student/history')}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-indigo-200 transition text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            <BookOpen className="text-gray-600" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-700">ประวัติการสอบ</h3>
                            <p className="text-sm text-gray-500 mt-0.5">ดูผลคะแนนและประวัติการสอบที่ผ่านมา</p>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default StudentHome;
