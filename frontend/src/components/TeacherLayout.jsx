import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, LogOut, Menu, X, FileText, PlusCircle } from 'lucide-react';

const TeacherLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'teacher' && parsedUser.email !== '66025694@up.ac.th') {
            navigate('/');
            return;
        }
        setUser(parsedUser);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const menuItems = [
        {
            name: 'Dashboard',
            path: '/teacher',
            icon: <LayoutDashboard size={20} />,
        },
        {
            name: 'นักเรียนทั้งหมด',
            path: '/teacher/students',
            icon: <Users size={20} />,
        },
        {
            name: 'รายการข้อสอบ',
            path: '/teacher/exams',
            icon: <FileText size={20} />,
        },
        {
            name: 'สร้างข้อสอบ',
            path: '/teacher/exams/create',
            icon: <PlusCircle size={20} />,
        },
    ];

    const isActive = (path) => {
        if (path === '/teacher') {
            return location.pathname === '/teacher';
        }
        return location.pathname === path;
    };

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Mobile Header */}
            {isMobile && (
                <div className="fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white h-14 flex items-center justify-between px-4 shadow-lg">
                    <h1 className="text-lg font-bold text-indigo-400">Exam</h1>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                    >
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            )}

            {/* Overlay for mobile */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-white w-64 transition-transform duration-300 ease-in-out
                    ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
                    ${isMobile ? 'top-14 shadow-2xl' : 'top-0'}
                `}
            >
                {/* Desktop Logo */}
                {!isMobile && (
                    <div className="flex h-16 items-center justify-center px-4 border-b border-gray-700">
                        <h1 className="text-xl font-bold text-indigo-400">
                            Exam
                        </h1>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => {
                                navigate(item.path);
                                if (isMobile) setSidebarOpen(false);
                            }}
                            className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.path)
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span className="ml-3">{item.name}</span>
                        </button>
                    ))}
                </nav>

                {/* User Info & Logout */}
                <div className="border-t border-gray-700 p-4 space-y-3">
                    <div className="text-sm">
                        <p className="font-medium text-white truncate">{user.firstName} {user.lastName}</p>
                        <p className="text-gray-400 text-xs truncate">{user.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
                    >
                        <LogOut size={20} />
                        <span className="ml-3">ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 min-h-screen ${isMobile ? 'pt-14' : 'ml-64'}`}>
                <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default TeacherLayout;
