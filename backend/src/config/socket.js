const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : true,
            credentials: true,
        },
    });

    // Auth middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error('Authentication required'));
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (!user) return next(new Error('User not found'));
            
            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] ${socket.user.role} connected: ${socket.user.firstName} ${socket.user.lastName}`);

        socket.on('join-session', (sessionId) => {
            socket.join(`session:${sessionId}`);
            if (socket.user.role === 'teacher') {
                socket.join(`teacher:${sessionId}`);
            }
        });

        socket.on('leave-session', (sessionId) => {
            socket.leave(`session:${sessionId}`);
            socket.leave(`teacher:${sessionId}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] ${socket.user.firstName} disconnected`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

module.exports = { initSocket, getIO };
