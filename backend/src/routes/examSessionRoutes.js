const express = require('express');
const router = express.Router();
const {
    startExam,
    stopExam,
    getSessionStatus,
    getQRToken,
    joinExam,
    getAttempt,
    autoSave,
    submitExam,
    logCheatEvent,
    getCheatLogs,
    getStudentCheatLogs,
    toggleStudentSuspension,
    getExamHistory,
    getSessionAttempts,
    getMyAttemptStatus,
    deleteSession,
} = require('../controllers/examSessionController');
const { protect, teacher } = require('../middleware/authMiddleware');

// Teacher-only routes
router.post('/:examId/start', protect, teacher, startExam);
router.post('/:examId/stop', protect, teacher, stopExam);
router.get('/:examId/qr', protect, teacher, getQRToken);
router.get('/:examId/attempts', protect, teacher, getSessionAttempts);
router.get('/:examId/cheat-logs', protect, teacher, getCheatLogs);
router.get('/:examId/students/:studentId/logs', protect, teacher, getStudentCheatLogs);
router.post('/:examId/students/:studentId/suspend', protect, teacher, toggleStudentSuspension);
router.get('/:examId/history', protect, teacher, getExamHistory);
router.delete('/:sessionId', protect, teacher, deleteSession);

// Student routes (authenticated)
router.post('/:examId/join', protect, joinExam);
router.get('/:examId/attempt', protect, getAttempt);
router.post('/:examId/auto-save', protect, autoSave);
router.post('/:examId/submit', protect, submitExam);
router.post('/:examId/cheat-log', protect, logCheatEvent);
router.get('/:examId/my-status', protect, getMyAttemptStatus);

// Status (both teacher and student)
router.get('/:examId/status', protect, getSessionStatus);

module.exports = router;
