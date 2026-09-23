// Logs requests slower than SLOW_REQUEST_MS so production logs reveal
// exactly which endpoint is slow instead of guessing.
const SLOW_REQUEST_MS = Number.parseInt(process.env.SLOW_REQUEST_MS, 10) || 2000;

const requestTimer = (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        if (ms >= SLOW_REQUEST_MS) {
            console.warn(
                `[slow-request] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${Math.round(ms)}ms`
            );
        }
    });
    next();
};

module.exports = requestTimer;
