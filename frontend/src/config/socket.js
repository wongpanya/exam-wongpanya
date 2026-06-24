import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

let socket = null;

export const getSocket = () => {
    if (socket) return socket;

    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user?.token) return null;

        socket = io(SOCKET_URL, {
            auth: { token: user.token },
            transports: ['websocket'], // ✅ Force WebSocket to save RAM/CPU and prevent DO App connection limits
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
        });

        socket.on('connect_error', (err) => {
            console.warn('[Socket] Connection error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        return socket;
    } catch (e) {
        console.warn('[Socket] Init error:', e);
        return null;
    }
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
