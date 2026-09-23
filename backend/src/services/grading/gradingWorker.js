const mongoose = require('mongoose');
const aiConfig = require('../../config/aiConfig');
const GradingResult = require('../../models/gradingResultModel');
const { processGradingResult } = require('./gradingService');

let timer = null;
let running = false;
const MIN_POLL_MS = 1000;
const IDLE_POLL_MS = Math.max(aiConfig.workerPollMs || 3000, 15000);

const scheduleNext = (delay) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, delay);
    timer.unref?.();
};

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
            // More work might be waiting, process promptly
            scheduleNext(MIN_POLL_MS);
        } else {
            // Idle: wait longer to reduce CPU and DB load on Eco tier
            scheduleNext(IDLE_POLL_MS);
        }
    } catch (error) {
        // Safe structured logging only: never include prompts, answers, headers, or provider responses.
        console.error('[ai-grading-worker]', {
            code: error?.code || 'WORKER_ERROR',
            message: String(error?.message || 'Unknown worker error').slice(0, 500),
        });
        scheduleNext(IDLE_POLL_MS);
    } finally {
        running = false;
    }
};

const wakeGradingWorker = () => {
    if (!running) {
        scheduleNext(100);
    }
};

const startGradingWorker = () => {
    if (timer) return;
    scheduleNext(1000);
};

const stopGradingWorker = () => {
    if (timer) clearTimeout(timer);
    timer = null;
};

module.exports = { startGradingWorker, stopGradingWorker, tick, wakeGradingWorker };
