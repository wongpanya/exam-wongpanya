const express = require('express');
const router = express.Router();
const {
    startExam,
    stopExam,
    getSessionStatus,
    getQRToken,
    joinExam,
    joinExamByCode,
    getAttempt,
    autoSave,
    submitExam,
    logCheatEvent,
    logCheatEventBatch,
    getCheatLogs,
    getStudentCheatLogs,
    toggleStudentSuspension,
    getExamHistory,
    getSessionAttempts,
    getMyAttemptStatus,
    deleteSession,
} = require('../controllers/examSessionController');
const { protect, teacher } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { cheatLogLimiter } = require('../middleware/rateLimiter');
const { startSessionSchema, joinSessionSchema, autoSaveSchema, submitSchema, cheatLogSchema, cheatLogBatchSchema } = require('../schemas/sessionSchemas');

// Teacher-only routes
router.post('/:examId/start', protect, teacher, validate(startSessionSchema), startExam);
router.post('/:examId/stop', protect, teacher, stopExam);
router.get('/:examId/qr', protect, teacher, getQRToken);
router.get('/:examId/attempts', protect, teacher, getSessionAttempts);
router.get('/:examId/cheat-logs', protect, teacher, getCheatLogs);
router.get('/:examId/students/:studentId/logs', protect, teacher, getStudentCheatLogs);
router.post('/:examId/students/:studentId/suspend', protect, teacher, toggleStudentSuspension);
router.get('/:examId/history', protect, teacher, getExamHistory);
router.delete('/:sessionId', protect, teacher, deleteSession);

// Student routes (authenticated)
router.post('/join-by-code', protect, joinExamByCode);
router.post('/:examId/join', protect, validate(joinSessionSchema), joinExam);
router.get('/:examId/attempt', protect, getAttempt);
router.post('/:examId/auto-save', protect, validate(autoSaveSchema), autoSave);
router.post('/:examId/submit', protect, validate(submitSchema), submitExam);
router.post('/:examId/cheat-log', protect, cheatLogLimiter, validate(cheatLogSchema), logCheatEvent);
router.post('/:examId/cheat-log-batch', protect, cheatLogLimiter, validate(cheatLogBatchSchema), logCheatEventBatch);
router.get('/:examId/my-status', protect, getMyAttemptStatus);

// Status (both teacher and student)
router.get('/:examId/status', protect, getSessionStatus);

module.exports = router;
