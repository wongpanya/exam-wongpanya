import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
                <h1 className="text-8xl font-bold text-gray-200 mb-4">404</h1>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">ไม่พบหน้าที่ต้องการ</h2>
                <p className="text-gray-500 mb-8">หน้าที่คุณกำลังมองหาอาจถูกย้ายหรือไม่มีอยู่</p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center gap-2"
                    >
                        <ArrowLeft size={18} /> ย้อนกลับ
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                    >
                        <Home size={18} /> หน้าหลัก
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
