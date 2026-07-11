const mongoose = require('mongoose');
const aiConfig = require('../../config/aiConfig');
const GradingResult = require('../../models/gradingResultModel');
const { processGradingResult } = require('./gradingService');

let timer = null;
let running = false;

const findNextResult = async () => {
    const now = new Date();
    return GradingResult.findOne({
        $or: [
            { status: 'pending' },
            { status: 'processing', lockExpiresAt: { $lt: now } },
        ],
    }).sort({ createdAt: 1 }).select('_id');
};

const tick = async () => {
    if (running || mongoose.connection.readyState !== 1) return;
    running = true;
    try {
        const next = await findNextResult();
        if (next) {
            await processGradingResult(next._id);
        }
    } catch (error) {
        // Safe structured logging only: never include prompts, answers, headers, or provider responses.
        console.error('[ai-grading-worker]', {
            code: error?.code || 'WORKER_ERROR',
            message: String(error?.message || 'Unknown worker error').slice(0, 500),
        });
    } finally {
        running = false;
    }
};

const startGradingWorker = () => {
    if (timer) return;
    timer = setInterval(tick, aiConfig.workerPollMs);
    timer.unref?.();
    setImmediate(tick);
};

const stopGradingWorker = () => {
    if (timer) clearInterval(timer);
    timer = null;
};

module.exports = { startGradingWorker, stopGradingWorker, tick };
