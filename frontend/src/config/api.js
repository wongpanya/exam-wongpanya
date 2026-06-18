import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — inject auth token
api.interceptors.request.use(
    (config) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user?.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        } catch (e) {
            // ignore parse errors
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            // Only redirect if not already on login/register page
            if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
