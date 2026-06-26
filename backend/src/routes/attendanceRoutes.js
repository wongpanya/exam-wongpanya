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

// Student check-in endpoint
router.route('/join')
    .post(protect, joinAttendance);

// Teacher session endpoints
router.route('/')
    .post(protect, teacher, createAttendanceSession);

router.route('/category/:categoryId')
    .get(protect, teacher, getAttendanceSessions);

router.route('/:id')
    .get(protect, getAttendanceSessionById)
    .put(protect, teacher, updateAttendanceSession)
    .delete(protect, teacher, deleteAttendanceSession);

router.route('/:id/rotate')
    .post(protect, teacher, rotateAttendanceCode);

router.route('/:id/status')
    .post(protect, teacher, updateAttendanceStatus);

router.route('/:id/manual')
    .post(protect, teacher, manualUpdateRecord);

module.exports = router;
