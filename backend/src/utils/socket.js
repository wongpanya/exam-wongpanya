const { Server } = require("socket.io");

let io;

module.exports = {
    init: (httpServer, corsOptions) => {
        io = new Server(httpServer, {
            cors: corsOptions
        });

        io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);

            // Students can join their specific room to receive targeted events (like suspension)
            socket.on("join_student_room", (studentId) => {
                if (studentId) {
                    const roomName = `student_${studentId}`;
                    socket.join(roomName);
                    console.log(`Socket ${socket.id} joined room ${roomName}`);
                }
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
