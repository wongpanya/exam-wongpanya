import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role === 'teacher') {
                navigate('/teacher');
            } else if (parsedUser.role === 'student') {
                navigate('/student');
            }
            setUser(parsedUser);
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="text-center p-8 bg-white rounded-xl shadow-md w-full max-w-md">
                <h1 className="text-4xl font-bold mb-6 text-indigo-600">Exam System</h1>

                {user ? (
                    <div className="space-y-4">
                        <p className="text-xl">Welcome, <span className="font-bold text-gray-800">{user.firstName} {user.lastName}</span></p>
                        <p className="text-gray-600">Role: <span className="px-2 py-1 bg-gray-200 rounded text-sm uppercase font-semibold">{user.role}</span></p>
                        <button
                            onClick={handleLogout}
                            className="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition shadow-sm"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4">
                        <p className="text-gray-600 mb-4">Please login or register to continue.</p>
                        <div className="flex space-x-4 justify-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm font-medium"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition shadow-sm font-medium"
                            >
                                Register
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
