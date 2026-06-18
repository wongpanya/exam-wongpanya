const rateLimit = require('express-rate-limit');

// Auth (login/register) — strict: prevent brute-force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API — generous enough for 300 students polling every 15s
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,  // Increased from 100: 300 students × 1 req/15s = 20 req/min per student is fine
    message: { message: 'Too many requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Cheat log — students send batches every 10s at most
const cheatLogLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,  // Increased from 60: 300 students sending occasional cheat events
    message: { message: 'Too many cheat log requests' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, cheatLogLimiter };
