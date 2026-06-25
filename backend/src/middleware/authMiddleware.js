const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const userCache = new Map();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedUser(userId) {
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
        return cached.user;
    }
    userCache.delete(userId);
    return null;
}

function setCachedUser(userId, user) {
    if (userCache.size > 10000) {
        const firstKey = userCache.keys().next().value;
        userCache.delete(firstKey);
    }
    userCache.set(userId, { user, timestamp: Date.now() });
}

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let user = getCachedUser(decoded.id);
            if (!user) {
                user = await User.findById(decoded.id).select('-password');
                if (user) setCachedUser(decoded.id, user);
            }

            req.user = user;

            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const teacher = (req, res, next) => {
    if (req.user && req.user.role === 'teacher') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as a teacher');
    }
};

module.exports = { protect, teacher };
