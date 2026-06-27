const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const connectDB = require("./config/db");

// Load env vars
dotenv.config();

// Environment validation
if (!process.env.MONGODB_URL || !process.env.JWT_SECRET) {
    console.error("FATAL ERROR: MONGODB_URL and JWT_SECRET are required.");
    process.exit(1);
}

// Connect to database
connectDB();

const app = express();
app.set('trust proxy', 1); // ✅ REQUIRED for Rate Limiter behind Vercel/DigitalOcean Proxy

const server = http.createServer(app);

// Socket.io initialization (Phase 2)
const { initSocket } = require('./config/socket');
const io = initSocket(server);

// Security Headers
app.use(helmet());

// Logging
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined"));
}

// Compression
app.use(compression());

// ✅ CORS (แนะนำให้ fix origin ตอน production)
app.use(
    cors({
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : true,
        credentials: true,
    })
);

app.use(express.json({ limit: "2mb" }));

// ✅ Health check for DigitalOcean (excluded from rate limiting)
app.get("/api/health", (req, res) => {
    res.json({ 
        ok: true, 
        time: new Date().toISOString(),
        dbConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Root
app.get("/", (req, res) => {
    res.send("API is running...");
});

// ✅ Global Rate Limiter — covers all /api/* endpoints
// Must be placed BEFORE route mounts and AFTER /api/health
const { apiLimiter } = require("./middleware/rateLimiter");
app.use("/api", apiLimiter);

// Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/exams", require("./routes/examRoutes"));
app.use("/api/exam-sessions", require("./routes/examSessionRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));

// Error middleware
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
app.use(notFound);
app.use(errorHandler);

// ✅ IMPORTANT: DO injects PORT (usually 8080)
const PORT = process.env.PORT || 5001;

// ✅ Bind to 0.0.0.0 for container/host platforms
server.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Server running in ${process.env.NODE_ENV || "development"} on port ${PORT}`
    );
});

// Graceful Shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        mongoose.connection.close(false).then(() => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
    setTimeout(() => { process.exit(1); }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
