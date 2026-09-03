import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect, Suspense } from 'react';
import { LogOut, QrCode } from 'lucide-react';

const ContentLoader = () => (
    <div className="py-20 flex items-center justify-center">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
            <p className="text-gray-400 text-xs">กำลังโหลดเนื้อหา...</p>
        </div>
    </div>
);

const StudentLayout = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'student') {
            navigate('/');
            return;
        }
        setUser(parsedUser);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-gray-900 text-white shadow-lg">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <QrCode size={22} className="text-indigo-400" />
                        <h1 className="text-lg font-bold text-indigo-400">Exam</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-300 hidden sm:block">
                            {user.firstName} {user.lastName}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
                            title="ออกจากระบบ"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto p-4 sm:p-6">
                <Suspense fallback={<ContentLoader />}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};

export default StudentLayout;
