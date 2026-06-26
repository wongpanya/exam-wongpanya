const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const AttendanceSession = require('../models/attendanceSessionModel');
const Category = require('../models/categoryModel');
const User = require('../models/userModel');
const { generateQRToken, parseQRToken, verifyQRToken } = require('../utils/qrToken');
const { getIO } = require('../config/socket');

const QR_SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || 'qr-secret-key';

// Helper to emit live check-ins
const emitCheckIn = (sessionId, record) => {
    try {
        getIO().to(`session:${sessionId}`).emit('student-checked-in', record);
    } catch (e) {
        console.warn('Socket emit failed for attendance:', e.message);
    }
};

const createAttendanceSession = asyncHandler(async (req, res) => {
    const { categoryId, name, qrRotateInterval, absentCutoffAt } = req.body;

    if (!categoryId || !name) {
        res.status(400);
        throw new Error('กรุณาระบุรายวิชาและชื่อการเช็คชื่อ');
    }

    const category = await Category.findById(categoryId);
    if (!category) {
        res.status(404);
        throw new Error('ไม่พบรายวิชาดังกล่าว');
    }

    // Owner check
    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงรายวิชานี้');
    }

    // Generate dynamic OTP
    const shortCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const rotateSeconds = qrRotateInterval || 10;

    const session = await AttendanceSession.create({
        category: categoryId,
        name: name.trim(),
        status: 'active',
        qrRotateInterval: rotateSeconds,
        activeShortCode: shortCode,
        shortCodeExpiresAt: new Date(Date.now() + (rotateSeconds + 5) * 1000),
        absentCutoffAt: absentCutoffAt ? new Date(absentCutoffAt) : null,
        createdBy: req.user._id,
        records: []
    });

    res.status(201).json(session);
});

// @desc    Get all attendance sessions for a specific category
// @route   GET /api/attendance/category/:categoryId
// @access  Private/Teacher
const getAttendanceSessions = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
        res.status(404);
        throw new Error('ไม่พบรายวิชาดังกล่าว');
    }

    // Owner check
    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงรายวิชานี้');
    }

    const sessions = await AttendanceSession.find({ category: categoryId }).sort({ createdAt: -1 });
    res.json(sessions);
});

const getAttendanceSessionById = asyncHandler(async (req, res) => {
    const session = await AttendanceSession.findById(req.params.id)
        .populate('records.student', 'firstName lastName email phoneNumber')
        .populate({
            path: 'category',
            select: 'name createdBy students',
            populate: {
                path: 'students',
                select: 'firstName lastName email phoneNumber'
            }
        });

    if (!session) {
        res.status(404);
        throw new Error('ไม่พบการเช็คชื่อนี้');
    }

    // Owner/User check
    const isTeacher = req.user.role === 'teacher' || req.user.email === '66025694@up.ac.th';
    const isStudent = req.user.role === 'student';

    if (isTeacher) {
        if (session.category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
            res.status(403);
            throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้');
        }
    }

    res.json(session);
});

// @desc    Update attendance session name
// @route   PUT /api/attendance/:id
// @access  Private/Teacher
const updateAttendanceSession = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('กรุณาระบุชื่อการเช็คชื่อ');
    }

    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
        res.status(404);
        throw new Error('ไม่พบการเช็คชื่อนี้');
    }

    // Owner check
    if (session.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้');
    }

    session.name = name.trim();
    await session.save();

    res.json(session);
});

// @desc    Delete an attendance session
// @route   DELETE /api/attendance/:id
// @access  Private/Teacher
const deleteAttendanceSession = asyncHandler(async (req, res) => {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
        res.status(404);
        throw new Error('ไม่พบการเช็คชื่อนี้');
    }

    // Owner check
    if (session.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้');
    }

    await session.deleteOne();
    res.json({ message: 'ลบการเช็คชื่อเสร็จสิ้น' });
});

// @desc    Rotate PIN and QR code token for active attendance session
// @route   POST /api/attendance/:id/rotate
// @access  Private/Teacher
const rotateAttendanceCode = asyncHandler(async (req, res) => {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
        res.status(404);
        throw new Error('ไม่พบการเช็คชื่อนี้');
    }

    if (session.status !== 'active') {
        res.status(400);
        throw new Error('การเช็คชื่อปิดอยู่ ไม่สามารถหมุนรหัสได้');
    }

    // Generate unique 6-digit short code
    let shortCode;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
        shortCode = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await AttendanceSession.findOne({ activeShortCode: shortCode, status: 'active' });
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }

    // Archive current code
    if (session.activeShortCode) {
        session.previousShortCode = session.activeShortCode;
        session.previousShortCodeExpiresAt = new Date(Date.now() + 5000); // 5 seconds buffer
    }

    session.activeShortCode = shortCode;
    session.shortCodeExpiresAt = new Date(Date.now() + (session.qrRotateInterval + 5) * 1000);
    await session.save();

    // Generate signed QR Token using session ID
    const token = generateQRToken(session._id.toString(), QR_SECRET, session.qrRotateInterval);

    res.json({ token, shortCode });
});

// @desc    Toggle active/closed status or change rotation interval
// @route   POST /api/attendance/:id/status
// @access  Private/Teacher
const updateAttendanceStatus = asyncHandler(async (req, res) => {
    const { status, qrRotateInterval, absentCutoffAt } = req.body;

    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
        res.status(404);
        throw new Error('ไม่พบการเช็คชื่อนี้');
    }

    // Owner check
    if (session.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้');
    }

    if (status !== undefined) {
        session.status = status;
        if (status === 'closed') {
            session.activeShortCode = null;
            session.previousShortCode = null;
        } else if (status === 'active') {
            // Generate a fresh code
            const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
            session.activeShortCode = shortCode;
            session.shortCodeExpiresAt = new Date(Date.now() + ((qrRotateInterval || session.qrRotateInterval) + 5) * 1000);
        }
    }

    if (qrRotateInterval !== undefined) {
        session.qrRotateInterval = qrRotateInterval;
    }

    if (absentCutoffAt !== undefined) {
        session.absentCutoffAt = absentCutoffAt ? new Date(absentCutoffAt) : null;
    }

    await session.save();
    res.json(session);
});

// @desc    Manually add/edit/delete a student check-in record
// @route   POST /api/attendance/:id/manual
// @access  Private/Teacher
const manualUpdateRecord = asyncHandler(async (req, res) => {
    const { studentId, status, remark } = req.body;

    if (!studentId || !status) {
        res.status(400);
        throw new Error('กรุณาระบุนักเรียนและสถานะการเข้าเรียน');
    }

    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
        res.status(404);
        throw new Error('ไม่พบการเช็คชื่อนี้');
    }

    // Owner check
    if (session.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้');
    }

    const studentExists = await User.findById(studentId);
    if (!studentExists) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลนักเรียนนี้ในระบบ');
    }

    // Update or insert record
    const existingIndex = session.records.findIndex(
        (r) => r.student.toString() === studentId.toString()
    );

    if (existingIndex > -1) {
        // Edit status
        session.records[existingIndex].status = status;
        session.records[existingIndex].remark = remark || '';
    } else {
        // Add new manually
        session.records.push({
            student: studentId,
            status,
            checkedInAt: Date.now(),
            remark: remark || 'เพิ่มโดยอาจารย์ผู้สอน'
        });
    }

    await session.save();
    res.json({ message: 'ปรับปรุงสถานะสำเร็จ' });
});

// @desc    Check-in for attendance (Student scan QR or enter PIN)
// @route   POST /api/attendance/join
// @access  Private/Student
const joinAttendance = asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) {
        res.status(400);
        throw new Error('กรุณาระบุรหัสเช็คชื่อหรือสแกน QR Code');
    }

    let session;

    // Check if code contains dots -> QR Token
    if (code.includes('.')) {
        let tokenData;
        try {
            tokenData = parseQRToken(code);
        } catch (e) {
            res.status(400);
            throw new Error('รูปแบบ QR Code สำหรับเช็คชื่อไม่ถูกต้อง');
        }

        const verifyResult = verifyQRToken(tokenData, QR_SECRET);
        if (!verifyResult.valid) {
            res.status(400);
            throw new Error(verifyResult.error === 'Token expired' ? 'QR Code หมดอายุแล้ว' : 'QR Code ไม่ถูกต้อง');
        }

        session = await AttendanceSession.findById(tokenData.examId); // parsed token assigns first part to examId
    } else {
        // Normalise PIN input
        const cleaned = code.trim().replace(/\s+/g, '');
        
        // Find session where code matches active shortcode or previous shortcode within its buffer
        session = await AttendanceSession.findOne({
            status: 'active',
            $or: [
                { activeShortCode: cleaned, shortCodeExpiresAt: { $gte: new Date() } },
                { previousShortCode: cleaned, previousShortCodeExpiresAt: { $gte: new Date() } }
            ]
        });
    }

    if (!session) {
        res.status(404);
        throw new Error('ไม่พบการเช็คชื่อเข้าเรียน หรือรหัสเช็คชื่อหมดอายุแล้ว');
    }

    if (session.status !== 'active') {
        res.status(400);
        throw new Error('การเช็คชื่อนี้ถูกปิดการเข้าร่วมชั่วคราวแล้ว');
    }

    // Check student category membership
    const category = await Category.findById(session.category);
    if (!category || !category.students.includes(req.user._id)) {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์เช็คชื่อในรายวิชานี้เนื่องจากยังไม่ได้ลงทะเบียนเรียน');
    }

    // Check if already checked in
    const existingIndex = session.records.findIndex(
        (r) => r.student.toString() === req.user._id.toString()
    );

    if (existingIndex > -1 && session.records[existingIndex].status !== 'absent') {
        return res.json({
            message: 'คุณได้เช็คชื่อเข้าเรียนในวิชานี้เรียบร้อยแล้ว',
            sessionName: session.name
        });
    }

    // Determine status based on cutoff time (if past cutoff, mark as late, else present)
    let status = 'present';
    let remark = 'เช็คชื่อด้วยระบบสแกน';
    if (session.absentCutoffAt && new Date() > session.absentCutoffAt) {
        status = 'late';
        remark = 'เช็คชื่อด้วยระบบสแกน (เข้าเรียนสาย)';
    }

    // Perform check-in
    if (existingIndex > -1) {
        session.records[existingIndex].status = status;
        session.records[existingIndex].checkedInAt = Date.now();
        session.records[existingIndex].remark = remark;
    } else {
        session.records.push({
            student: req.user._id,
            status,
            checkedInAt: Date.now(),
            remark
        });
    }

    await session.save();

    // Socket notification for live logs update on teacher screen
    const studentInfo = {
        student: {
            _id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
        },
        status,
        checkedInAt: new Date(),
        remark
    };
    emitCheckIn(session._id.toString(), studentInfo);

    const checkInMsg = status === 'late'
        ? 'เช็คชื่อเข้าเรียนสำเร็จ (ระบบเช็คสถานะเป็น สาย)'
        : 'เช็คชื่อเข้าเรียนเสร็จสิ้นสำเร็จ!';

    res.json({
        message: checkInMsg,
        sessionName: session.name
    });
});

module.exports = {
    createAttendanceSession,
    getAttendanceSessions,
    getAttendanceSessionById,
    updateAttendanceSession,
    deleteAttendanceSession,
    rotateAttendanceCode,
    updateAttendanceStatus,
    manualUpdateRecord,
    joinAttendance
};
