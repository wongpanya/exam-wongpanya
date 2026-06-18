/**
 * In-Memory Cheat Violation Tracker
 * 
 * เก็บจำนวน violation ต่อ student ต่อ session ใน memory
 * เพื่อลด DB queries ใน logCheatEvent (ไม่ต้อง CheatingLog.find() ทุกครั้ง)
 * 
 * Key format: "sessionId:studentId"
 */

const violationCounts = new Map();
const MAX_ENTRIES = 50000;

function makeKey(sessionId, studentId) {
    return `${sessionId}:${studentId}`;
}

/**
 * เพิ่ม violation count +1 แล้ว return count ปัจจุบัน
 */
function increment(sessionId, studentId, amount = 1) {
    if (violationCounts.size >= MAX_ENTRIES) {
        const firstKey = violationCounts.keys().next().value;
        violationCounts.delete(firstKey);
    }
    const key = makeKey(sessionId, studentId);
    const current = violationCounts.get(key) || 0;
    const newCount = current + amount;
    violationCounts.set(key, newCount);
    return newCount;
}

/**
 * ดึง count ปัจจุบัน
 */
function get(sessionId, studentId) {
    return violationCounts.get(makeKey(sessionId, studentId)) || 0;
}

/**
 * Reset count เป็น 0 (เมื่อ unsuspend)
 */
function reset(sessionId, studentId) {
    violationCounts.delete(makeKey(sessionId, studentId));
}

/**
 * ลบทุก key ที่เริ่มด้วย sessionId (เมื่อสอบจบ/ลบ session)
 */
function clearSession(sessionId) {
    const prefix = `${sessionId}:`;
    let cleared = 0;
    for (const key of violationCounts.keys()) {
        if (key.startsWith(prefix)) {
            violationCounts.delete(key);
            cleared++;
        }
    }
    if (cleared > 0) {
        console.log(`[CheatTracker] Cleared ${cleared} entries for session ${sessionId}`);
    }
}

/**
 * ดึงขนาด Map ปัจจุบัน (สำหรับ monitoring)
 */
function size() {
    return violationCounts.size;
}

async function initFromDB(sessionId) {
    const CheatingLog = require('../models/cheatingLogModel');
    const counts = await CheatingLog.aggregate([
        { $match: { session: new (require('mongoose').Types.ObjectId)(sessionId), isResolved: { $ne: true } } },
        { $group: { _id: '$student', count: { $sum: 1 } } },
    ]);
    counts.forEach(c => {
        violationCounts.set(makeKey(sessionId, c._id.toString()), c.count);
    });
    return counts.length;
}

module.exports = {
    increment,
    get,
    reset,
    clearSession,
    size,
    initFromDB,
};
