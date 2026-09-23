// Short-lived cache for "latest session of an exam".
// This exact query runs in nearly every exam endpoint, so serving it from
// memory removes ~1 DB round-trip per request. Entries are plain read-only
// snapshots (top-level copies, BSON types preserved); writers must call
// invalidateSessionCache. Single-instance safe; TTL bounds any missed write.
const ExamSession = require('../models/examSessionModel');

const cache = new Map();
const TTL_MS = 30 * 1000;
const MAX_ENTRIES = 5000;

const getLatestSession = async (examId) => {
    const key = String(examId);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.timestamp < TTL_MS) {
        return { ...hit.doc };
    }
    const doc = await ExamSession.findOne({ exam: examId }).sort({ createdAt: -1 }).lean();
    if (!doc) {
        cache.delete(key);
        return null;
    }
    if (cache.size >= MAX_ENTRIES) {
        cache.delete(cache.keys().next().value);
    }
    cache.set(key, { doc, timestamp: Date.now() });
    return { ...doc };
};

const invalidateSessionCache = (examId) => {
    if (examId) cache.delete(String(examId));
};

module.exports = { getLatestSession, invalidateSessionCache };
