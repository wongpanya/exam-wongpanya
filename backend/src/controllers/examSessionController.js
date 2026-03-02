const asyncHandler = require('express-async-handler');
const Exam = require('../models/examModel');
const ExamSession = require('../models/examSessionModel');
const ExamAttempt = require('../models/examAttemptModel');
const CheatingLog = require('../models/cheatingLogModel');
const User = require('../models/userModel');
const { generateQRToken, parseQRToken, verifyQRToken } = require('../utils/qrToken');

const QR_SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || 'qr-secret-key';

// @desc    Start an exam session
// @route   POST /api/exam-sessions/:examId/start
// @access  Private/Teacher
const startExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.examId);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    if (exam.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    // Check for active session
    let session = await ExamSession.findOne({
        exam: exam._id,
        status: 'active',
    });

    if (session) {
        return res.json(session);
    }

    const { qrRotateInterval, shuffleQuestions, cheatConfig, maxCheatEvents } = req.body;

    session = await ExamSession.create({
        exam: exam._id,
        createdBy: req.user._id,
        status: 'active',
        startedAt: Date.now(),
        qrRotateInterval: qrRotateInterval || 10,
        shuffleQuestions: shuffleQuestions || false,
        cheatConfig: cheatConfig || {},
        maxCheatEvents: maxCheatEvents !== undefined ? maxCheatEvents : 1,
    });

    res.status(201).json(session);
});

// @desc    Stop an exam session
// @route   POST /api/exam-sessions/:examId/stop
// @access  Private/Teacher
const stopExam = asyncHandler(async (req, res) => {
    const session = await ExamSession.findOne({
        exam: req.params.examId,
        status: 'active',
    });

    if (!session) {
        res.status(404);
        throw new Error('No active session found');
    }

    if (session.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    session.status = 'ended';
    session.endedAt = Date.now();
    await session.save();

    // Mark all in-progress attempts as submitted (optional, or just handle gracefully)
    // For now, let's keep them as is, but maybe mark them 'submitted' with a flag?
    await ExamAttempt.updateMany(
        { session: session._id, status: 'in-progress' },
        { status: 'submitted', submittedAt: Date.now() } // Auto-submit
    );

    res.json(session);
});

// @desc    Get session status
// @route   GET /api/exam-sessions/:examId/status
// @access  Private (Teacher/Student)
const getSessionStatus = asyncHandler(async (req, res) => {
    const session = await ExamSession.findOne({
        exam: req.params.examId,
    }).sort({ createdAt: -1 });

    if (!session) {
        return res.json({ status: 'idle' });
    }

    res.json(session);
});

// @desc    Get QR Token for joining
// @route   GET /api/exam-sessions/:examId/qr
// @access  Private/Teacher
const getQRToken = asyncHandler(async (req, res) => {
    const session = await ExamSession.findOne({
        exam: req.params.examId,
        status: 'active',
    });

    if (!session) {
        res.status(404);
        throw new Error('No active session');
    }

    // Generate a short-lived token signed with secret
    const token = generateQRToken(req.params.examId, QR_SECRET);

    res.json({ token });
});

// @desc    Join an exam session
// @route   POST /api/exam-sessions/:examId/join
// @access  Private/Student
const joinExam = asyncHandler(async (req, res) => {
    const rawToken = req.body.qrToken || req.body.joinToken;

    if (!rawToken) {
        res.status(400);
        throw new Error('QR Token required');
    }

    let qrToken;
    try {
        qrToken = parseQRToken(rawToken);
    } catch (err) {
        res.status(400);
        throw new Error('Invalid QR Token format');
    }

    // Verify token
    const verification = verifyQRToken(qrToken, QR_SECRET);
    if (!verification.valid) {
        res.status(400);
        throw new Error(verification.error || 'Invalid or expired QR Token');
    }

    if (qrToken.examId !== req.params.examId) {
        res.status(400);
        throw new Error('QR Token does not match exam');
    }

    const session = await ExamSession.findOne({
        exam: qrToken.examId,
        status: 'active',
    });
    if (!session || session.status !== 'active') {
        res.status(400);
        throw new Error('Session is not active');
    }

    // Check existing attempt
    let attempt = await ExamAttempt.findOne({
        session: session._id,
        student: req.user._id,
    });

    if (attempt) {
        if (attempt.status === 'submitted') {
            res.status(400);
            throw new Error('You have already submitted this exam');
        }
        // If in-progress, resume
    } else {
        // Create new attempt
        // Calculate max score
        const exam = await Exam.findById(session.exam);
        const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 1), 0);

        // Handle randomization
        let questionOrder = exam.questions.map(q => q.questionId);
        if (session.shuffleQuestions) {
            for (let i = questionOrder.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questionOrder[i], questionOrder[j]] = [questionOrder[j], questionOrder[i]];
            }
        }

        attempt = await ExamAttempt.create({
            exam: session.exam,
            session: session._id,
            student: req.user._id,
            totalPoints,
            questionOrder,
            answers: [],
        });

        // Update student count
        await ExamSession.findByIdAndUpdate(session._id, { $inc: { studentCount: 1 } });
    }

    res.status(201).json({
        attemptId: attempt._id,
        message: 'Joined successfully'
    });
});

// @desc    Get student attempt (questions & state)
// @route   GET /api/exam-sessions/:examId/attempt
// @access  Private/Student
const getAttempt = asyncHandler(async (req, res) => {
    // Should pass examId, find active session
    // Or if checking history, maybe verify status

    // Find latest session for this exam
    const session = await ExamSession.findOne({
        exam: req.params.examId,
    }).sort({ createdAt: -1 });

    if (!session) {
        res.status(404);
        throw new Error('Session not found');
    }

    const attempt = await ExamAttempt.findOne({
        session: session._id,
        student: req.user._id,
    });

    if (!attempt) {
        res.status(404);
        throw new Error('Attempt not found');
    }

    // Only return questions if session is active or user submitted? 
    // Usually student needs questions to take exam.
    // If session ended, maybe show results?

    // Fetch exam questions but HIDE correct answers if active
    const exam = await Exam.findById(session.exam).select('-questions.correctAnswer');

    // Reorder questions if randomized
    let questions = exam.questions;
    if (attempt.questionOrder && attempt.questionOrder.length > 0) {
        const qMap = new Map(exam.questions.map(q => [q.questionId, q]));
        questions = attempt.questionOrder.map(id => qMap.get(id)).filter(Boolean);
    }

    res.json({
        attempt,
        exam: {
            title: exam.title,
            description: exam.description,
            durationMin: exam.durationMin,
            questions
        },
        session: {
            _id: session._id,
            startedAt: session.startedAt,
            status: session.status,
        },
        sessionStatus: session.status,
    });
});

// @desc    Auto-save answers
// @route   POST /api/exam-sessions/:examId/auto-save
// @access  Private/Student
const autoSave = asyncHandler(async (req, res) => {
    const { answers } = req.body; // Array of { questionId, answer }

    const session = await ExamSession.findOne({
        exam: req.params.examId,
    }).sort({ createdAt: -1 });

    if (!session) {
        res.status(404);
        throw new Error('Session not found');
    }

    const attempt = await ExamAttempt.findOne({
        session: session._id,
        student: req.user._id,
    });

    if (!attempt) {
        res.status(404);
        throw new Error('Attempt not found');
    }

    if (attempt.status === 'submitted') {
        res.status(400);
        throw new Error('Exam already submitted');
    }

    if (attempt.status === 'suspended') {
        res.status(403);
        throw new Error('Cannot save: Exam attempt is suspended');
    }

    const examData = await Exam.findById(session.exam);
    const startTime = new Date(session.startedAt).getTime();
    const durationMs = examData.durationMin * 60 * 1000;
    if (Date.now() > startTime + durationMs + 30000) {
        res.status(400);
        throw new Error('Exam time limit exceeded');
    }

    // Update answers
    // Merge logic: update existing answer or push new
    // We can just replace the array if we send full state, or merge carefully
    // Assuming frontend sends full state of answered questions
    attempt.answers = answers;
    await attempt.save();

    res.json({ message: 'Saved', saved: true, status: attempt.status });
});

// @desc    Submit exam
// @route   POST /api/exam-sessions/:examId/submit
// @access  Private/Student
const submitExam = asyncHandler(async (req, res) => {
    const { answers } = req.body;

    const session = await ExamSession.findOne({
        exam: req.params.examId,
    }).sort({ createdAt: -1 });

    if (!session) {
        res.status(404);
        throw new Error('Session not found');
    }

    const attempt = await ExamAttempt.findOne({
        session: session._id,
        student: req.user._id,
    });

    if (!attempt) {
        res.status(404);
        throw new Error('Attempt not found');
    }

    if (attempt.status === 'submitted') {
        res.status(400);
        throw new Error('Already submitted');
    }

    if (attempt.status === 'suspended') {
        res.status(403);
        throw new Error('Cannot submit: Exam attempt is suspended');
    }

    const examData = await Exam.findById(session.exam);
    const startTime = new Date(session.startedAt).getTime();
    const durationMs = examData.durationMin * 60 * 1000;
    if (Date.now() > startTime + durationMs + 30000) {
        res.status(400);
        throw new Error('Exam time limit exceeded');
    }

    // Save final answers
    attempt.answers = answers;
    attempt.status = 'submitted';
    attempt.submittedAt = Date.now();

    // Grade immediately
    const exam = await Exam.findById(session.exam);
    let score = 0;

    // Create map of correct answers
    const correctMap = new Map();
    exam.questions.forEach(q => {
        correctMap.set(q.questionId, { correct: q.correctAnswer, points: q.points || 1 });
    });

    attempt.answers.forEach(ans => {
        const qInfo = correctMap.get(ans.questionId);
        if (qInfo) {
            // Simple string comparison for now. 
            // For multiple choice, it's exact match index (0,1,2,3) usually stored as number or string
            // Assuming string/number equality
            if (String(ans.selectedAnswer) === String(qInfo.correct)) {
                score += qInfo.points;
            }
        }
    });

    attempt.score = score;
    await attempt.save();

    // Update session stats
    await ExamSession.findByIdAndUpdate(session._id, { $inc: { submittedCount: 1 } });

    res.json({ message: 'Submitted successfully', score, totalPoints: attempt.totalPoints });
});

// @desc    Log cheat event
// @route   POST /api/exam-sessions/:examId/cheat-log
// @access  Private/Student
const logCheatEvent = asyncHandler(async (req, res) => {
    const { eventType, detail } = req.body;

    const session = await ExamSession.findOne({
        exam: req.params.examId,
    }).sort({ createdAt: -1 });

    if (!session) {
        res.status(404);
        throw new Error('Session not found');
    }

    // Optionally check if attempt exists
    const attempt = await ExamAttempt.findOne({
        session: session._id,
        student: req.user._id, // Assuming protected route implies user
    });

    const log = await CheatingLog.create({
        exam: session.exam,
        session: session._id,
        student: req.user._id,
        eventType,
        detail,
        timestamp: Date.now(),
    });

    // Check for Auto-Suspend
    let suspendStatus = null;

    // Map raw event types to config keys
    const configKeyMap = {
        'tab_switch': 'tabSwitch',
        'blur': 'windowBlur',
        'copy': 'copyPaste',
        'cut': 'copyPaste',
        'paste': 'copyPaste',
        'right_click': 'rightClick',
        'print_screen': 'printScreen',
        'devtools': 'devTools',
        'forbidden_key': 'forbiddenKeys'
    };

    const configKey = configKeyMap[eventType] || eventType;

    // Check for Auto-Suspend - NOW MONITORS ALL EVENTS BY DEFAULT
    if (configKey) {

        // Fetch all logs
        const allLogs = await CheatingLog.find({
            session: session._id,
            student: req.user._id,
            isResolved: { $ne: true }
        });

        // Count how many logs map to ANY known cheat config key
        const currentViolationCount = allLogs.filter(l => {
            const key = configKeyMap[l.eventType] || l.eventType;
            return Object.values(configKeyMap).includes(key) || key === 'tabSwitch';
        }).length;

        const limit = (session.maxCheatEvents === undefined || session.maxCheatEvents === null) ? 1 : session.maxCheatEvents;

        // Only suspend if limit > 0
        if (limit > 0 && currentViolationCount >= limit) {
            // Auto-suspend the student
            const updatedAttempt = await ExamAttempt.findOneAndUpdate(
                { session: session._id, student: req.user._id },
                { status: 'suspended' },
                { new: true }
            );
            if (updatedAttempt) {
                suspendStatus = 'suspended';
            }
        }
    }


    res.status(201).json({ ...log.toObject(), suspendStatus });
});

// @desc    Get cheat logs for teacher
// @route   GET /api/exam-sessions/:examId/cheat-logs
// @access  Private/Teacher
const getCheatLogs = asyncHandler(async (req, res) => {
    // Support ?sessionId=...
    let session;
    if (req.query.sessionId) {
        session = await ExamSession.findById(req.query.sessionId);
    } else {
        session = await ExamSession.findOne({
            exam: req.params.examId,
        }).sort({ createdAt: -1 });
    }

    if (!session) {
        res.status(404);
        throw new Error('No session found');
    }

    if (session.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    // Get logs
    const logs = await CheatingLog.find({ session: session._id })
        .populate('student', 'firstName lastName email')
        .sort({ timestamp: -1 });

    // Aggregate summary
    const summary = await CheatingLog.aggregate([
        { $match: { session: session._id } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ]);

    // Aggregate by student
    const byStudent = await CheatingLog.aggregate([
        { $match: { session: session._id } },
        { $group: { 
            _id: '$student', 
            totalCount: { $sum: 1 },
            count: { 
                $sum: { $cond: [{ $eq: ['$isResolved', true] }, 0, 1] } 
            } 
        } },
        { $sort: { count: -1 } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'studentInfo' } },
        { $unwind: '$studentInfo' },
        {
            $project: {
                count: 1,
                totalCount: 1,
                'studentInfo.firstName': 1,
                'studentInfo.lastName': 1,
                'studentInfo.email': 1
            }
        },
    ]);

    // Check suspension status and score for students in the list
    const studentIds = byStudent.map(s => s._id);
    const attempts = await ExamAttempt.find({
        session: session._id,
        student: { $in: studentIds }
    });

    // Merge status and score into byStudent
    const byStudentWithStatus = byStudent.map(s => {
        const attempt = attempts.find(a => a.student.toString() === s._id.toString());
        return {
            ...s,
            status: attempt ? attempt.status : 'unknown',
            attemptId: attempt ? attempt._id : null,
            score: attempt ? attempt.score : 0,
            totalPoints: attempt ? attempt.totalPoints : 0,
            startedAt: attempt ? attempt.startedAt : null,
            submittedAt: attempt ? attempt.submittedAt : null,
        };
    });

    res.json({
        logs,
        summary,
        byStudent: byStudentWithStatus,
        totalEvents: logs.length,
        sessionStatus: session.status, // Add status to allow suspension if active
    });
});

// @desc    Get student cheat logs
// @route   GET /api/exam-sessions/:examId/students/:studentId/logs
// @access  Private/Teacher
const getStudentCheatLogs = asyncHandler(async (req, res) => {
    // Support ?sessionId=...
    let session;
    if (req.query.sessionId) {
        session = await ExamSession.findById(req.query.sessionId);
    } else {
        session = await ExamSession.findOne({
            exam: req.params.examId,
        }).sort({ createdAt: -1 });
    }

    if (!session) {
        res.status(404);
        throw new Error('No session found');
    }

    if (session.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    const logs = await CheatingLog.find({
        session: session._id,
        student: req.params.studentId
    }).sort({ timestamp: -1 });

    const unresolvedCount = await CheatingLog.countDocuments({
        session: session._id,
        student: req.params.studentId,
        isResolved: { $ne: true }
    });

    const attempt = await ExamAttempt.findOne({
        session: session._id,
        student: req.params.studentId
    })
        .populate('student', 'firstName lastName email photo')
        .populate({
            path: 'exam',
            select: 'title questions'
        });

    if (!attempt) {
        return res.status(404).json({ message: 'No attempt found' });
    }

    res.json({
        student: attempt.student,
        status: attempt.status,
        score: attempt.score,
        totalPoints: attempt.totalPoints,
        answers: attempt.answers,
        exam: attempt.exam,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        logs,
        unresolvedCount,
    });
});

// @desc    Toggle student suspension
// @route   POST /api/exam-sessions/:examId/students/:studentId/suspend
// @access  Private/Teacher
const toggleStudentSuspension = asyncHandler(async (req, res) => {
    const { suspend } = req.body; // true = suspend, false = unsuspend

    // Support specific session? Usually active session
    // For now find latest
    const session = await ExamSession.findOne({
        exam: req.params.examId,
    }).sort({ createdAt: -1 });

    if (!session) {
        res.status(404);
        throw new Error('No session found');
    }

    if (session.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    const attempt = await ExamAttempt.findOne({
        session: session._id,
        student: req.params.studentId
    });

    if (!attempt) {
        res.status(404);
        throw new Error('Attempt not found');
    }

    if (suspend && attempt.status !== 'submitted') {
        attempt.status = 'suspended';
    } else if (!suspend && attempt.status === 'suspended') {
        attempt.status = 'in-progress';
        
        // Mark all existing cheat logs as resolved so they don't count towards the next suspension
        await CheatingLog.updateMany(
            { session: session._id, student: req.params.studentId },
            { $set: { isResolved: true } }
        );
    }

    await attempt.save();

    res.json({
        success: true,
        status: attempt.status,
        message: suspend ? 'Student suspended' : 'Student unsuspended'
    });
});

// @desc    Get exam history
// @route   GET /api/exam-sessions/:examId/history
// @access  Private/Teacher
const getExamHistory = asyncHandler(async (req, res) => {
    const sessions = await ExamSession.find({
        exam: req.params.examId,
    }).sort({ startedAt: -1 }); // Newest first

    // Calculate stats for each session
    const sessionsWithStats = await Promise.all(sessions.map(async (session) => {
        const attempts = await ExamAttempt.find({ session: session._id });
        const cheatCount = await CheatingLog.countDocuments({ session: session._id });

        const submitted = attempts.filter(a => a.status === 'submitted');
        const totalScore = submitted.reduce((sum, a) => sum + (a.score || 0), 0);
        const avgScore = submitted.length > 0 ? (totalScore / submitted.length).toFixed(1) : 0;

        // Calculate max score (from one attempts points)
        const maxPoints = attempts.length > 0 ? attempts[0].totalPoints : 0;
        const avgPercent = maxPoints > 0 ? ((avgScore / maxPoints) * 100).toFixed(0) : 0;

        return {
            ...session.toObject(),
            studentCount: attempts.length,
            submittedCount: submitted.length,
            avgScore: avgPercent,
            cheatEvents: cheatCount,
        };
    }));

    res.json(sessionsWithStats);
});

// @desc    Get session attempts
// @route   GET /api/exam-sessions/:examId/attempts
// @access  Private/Teacher
const getSessionAttempts = asyncHandler(async (req, res) => {
    let session;
    if (req.query.sessionId) {
        session = await ExamSession.findById(req.query.sessionId);
    } else {
        session = await ExamSession.findOne({
            exam: req.params.examId,
            status: 'active'
        });
    }

    if (!session) return res.json([]);

    if (session.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to view this session');
    }

    const attempts = await ExamAttempt.find({ session: session._id })
        .populate('student', 'firstName lastName email');

    res.json(attempts);
});

// @desc    Get my attempt status (polling)
// @route   GET /api/exam-sessions/:examId/my-status
// @access  Private/Student
const getMyAttemptStatus = asyncHandler(async (req, res) => {
    // Find active or latest session
    const session = await ExamSession.findOne({
        exam: req.params.examId,
    }).sort({ createdAt: -1 });

    if (!session) {
        return res.json({ status: 'unknown' });
    }

    const attempt = await ExamAttempt.findOne({
        session: session._id,
        student: req.user._id,
    }, 'status');

    if (!attempt) {
        return res.json({ status: 'not-started' });
    }

    res.json({ status: attempt.status, sessionStatus: session.status });
});

// @desc    Delete an exam session and all related data
// @route   DELETE /api/exam-sessions/:sessionId
// @access  Private/Teacher
const deleteSession = asyncHandler(async (req, res) => {
    const session = await ExamSession.findById(req.params.sessionId);

    if (!session) {
        res.status(404);
        throw new Error('Session not found');
    }

    if (session.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    // Delete attempts
    await ExamAttempt.deleteMany({ session: session._id });

    // Delete cheat logs
    await CheatingLog.deleteMany({ session: session._id });

    // Delete session
    await session.deleteOne();

    res.json({ message: 'Session deleted successfully' });
});

module.exports = {
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
};
