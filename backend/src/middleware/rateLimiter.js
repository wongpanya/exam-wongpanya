const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Helper to extract JWT token for authenticated routes to avoid NAT IP blocking
const getAuthKey = (req) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization;
    }
    return ipKeyGenerator(req.ip);
};

// Auth (login/register) — strict: prevent brute-force
// Uses IP + email to prevent brute-forcing a single account, while allowing a classroom (same NAT IP) to log in together
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (req.body && req.body.email) {
            return `${ipKeyGenerator(req.ip)}_${req.body.email.toLowerCase().trim()}`;
        }
        return ipKeyGenerator(req.ip);
    }
});

// General API — covers all /api/* endpoints globally
// Uses JWT token if logged in, otherwise falls back to IP
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { message: 'Too many requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getAuthKey
});

// Mutation (create/update/delete) — stricter to prevent abuse
// Uses JWT token if logged in, otherwise falls back to IP
const mutationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { message: 'Too many write requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getAuthKey
});

// Cheat log — students send batches every 10s at most
// Uses JWT token if logged in, otherwise falls back to IP
const cheatLogLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: { message: 'Too many cheat log requests' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getAuthKey
});

module.exports = { authLimiter, apiLimiter, mutationLimiter, cheatLogLimiter };
