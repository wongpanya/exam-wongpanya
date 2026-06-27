const express = require('express');
const router = express.Router();
const {
    createAttendanceSession,
    getAttendanceSessions,
    getAttendanceSessionById,
    updateAttendanceSession,
    deleteAttendanceSession,
    rotateAttendanceCode,
    updateAttendanceStatus,
    manualUpdateRecord,
    joinAttendance
} = require('../controllers/attendanceController');
const { protect, teacher } = require('../middleware/authMiddleware');
const { mutationLimiter } = require('../middleware/rateLimiter');

// Student check-in endpoint
router.route('/join')
    .post(protect, joinAttendance);

// Teacher session endpoints
router.route('/')
    .post(protect, teacher, mutationLimiter, createAttendanceSession);

router.route('/category/:categoryId')
    .get(protect, teacher, getAttendanceSessions);

router.route('/:id')
    .get(protect, getAttendanceSessionById)
    .put(protect, teacher, mutationLimiter, updateAttendanceSession)
    .delete(protect, teacher, mutationLimiter, deleteAttendanceSession);

router.route('/:id/rotate')
    .post(protect, teacher, mutationLimiter, rotateAttendanceCode);

router.route('/:id/status')
    .post(protect, teacher, mutationLimiter, updateAttendanceStatus);

router.route('/:id/manual')
    .post(protect, teacher, mutationLimiter, manualUpdateRecord);

module.exports = router;
