const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// ✅ CORS (แนะนำให้ fix origin ตอน production)
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || true,
        credentials: true,
    })
);

app.use(express.json({ limit: "2mb" }));

// ✅ Health check for DigitalOcean
app.get("/api/health", (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
});

// Root
app.get("/", (req, res) => {
    res.send("API is running...");
});

// Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/exams", require("./routes/examRoutes"));
app.use("/api/exam-sessions", require("./routes/examSessionRoutes"));
app.use("/api/ai-generator", require("./routes/aiGeneratorRoutes"));

// Error middleware
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
app.use(notFound);
app.use(errorHandler);

const http = require("http");
const socket = require("./utils/socket");

// ✅ IMPORTANT: DO injects PORT (usually 8080)
const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

// Initialize Socket.io
socket.init(server, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
});

// ✅ Bind to 0.0.0.0 for container/host platforms
server.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Server running in ${process.env.NODE_ENV || "development"} on port ${PORT}`
    );
});
