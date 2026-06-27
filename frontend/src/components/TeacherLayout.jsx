import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, LogOut, Menu, X, FileText, PlusCircle } from 'lucide-react';
import api from '../config/api';

const TeacherLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [announcement, setAnnouncement] = useState(null);

    // Fetch announcements when loading layout
    useEffect(() => {
        const fetchAnnouncements = async () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) return;
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role !== 'teacher') return;

            try {
                const config = {
                    headers: { Authorization: `Bearer ${parsedUser.token}` }
                };
                const { data } = await api.get('/users/announcements', config);
                const unread = data.find(ann => !ann.read);
                if (unread) {
                    setAnnouncement(unread);
                }
            } catch (err) {
                console.error('Failed to fetch announcements:', err);
            }
        };

        fetchAnnouncements();
    }, [location.pathname]);

    const handleCloseAnnouncement = async () => {
        if (!announcement) return;
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                const config = {
                    headers: { Authorization: `Bearer ${parsedUser.token}` }
                };
                await api.put('/users/me/read-announcement', { announcementId: announcement.id }, config);
            }
            setAnnouncement(null);
        } catch (err) {
            console.error('Failed to mark announcement as read:', err);
            setAnnouncement(null);
        }
    };

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
        if (parsedUser.role !== 'teacher') {
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

            {/* Announcement Modal */}
            {announcement && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/30 to-purple-50/30 flex items-center justify-between flex-shrink-0">
                            <div>
                                <span className="text-[10px] font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full uppercase font-sans">
                                    ประกาศอัปเดตระบบ
                                </span>
                                <h3 className="text-base font-extrabold text-gray-900 mt-1 font-sans">
                                    {announcement.title}
                                </h3>
                            </div>
                            <span className="text-xs text-gray-400 font-medium font-sans">
                                {announcement.date}
                            </span>
                        </div>

                        {/* Body (Scrollable) */}
                        <div className="px-8 py-6 overflow-y-auto space-y-3 max-h-[60vh] font-sans">
                            {renderMarkdown(announcement.content)}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex justify-end items-center flex-shrink-0">
                            <button
                                onClick={handleCloseAnnouncement}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-100 transition-all font-sans cursor-pointer animate-pulse"
                            >
                                รับทราบการอัปเดต
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Simple Markdown to HTML renderer for announcements
const renderMarkdown = (text) => {
    if (!text) return '';
    
    // Escape standard characters for safety
    let processed = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Replace headers
    processed = processed.replace(/^## (.*$)/gim, '<h4 class="text-sm font-extrabold text-gray-800 mt-4 mb-1.5 border-b border-gray-100 pb-0.5 font-sans">$1</h4>');
    
    // Replace bullet lists
    processed = processed.replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-xs text-gray-600 my-1 leading-relaxed font-sans">$1</li>');
    
    // Replace bold text
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-indigo-700">$1</strong>');

    // Parse paragraph wraps
    const lines = processed.split('\n');
    let inList = false;
    const listFormatted = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('<li')) {
            if (!inList) {
                listFormatted.push('<ul class="space-y-0.5 my-1.5">');
                inList = true;
            }
            listFormatted.push(line);
        } else {
            if (inList) {
                listFormatted.push('</ul>');
                inList = false;
            }
            if (trimmed.startsWith('<h4') || trimmed === '') {
                listFormatted.push(line);
            } else {
                listFormatted.push(`<p class="text-xs text-gray-600 leading-relaxed mb-2 font-sans">${line}</p>`);
            }
        }
    });

    if (inList) {
        listFormatted.push('</ul>');
    }

    const html = listFormatted.join('\n');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default TeacherLayout;
