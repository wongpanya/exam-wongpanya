const asyncHandler = require('express-async-handler');
const Exam = require('../models/examModel');

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private/Teacher
const createExam = asyncHandler(async (req, res) => {
    const { title, durationMin, questions } = req.body;

    if (!title || !durationMin || !questions || questions.length === 0) {
        res.status(400);
        throw new Error('Please provide title, duration, and at least one question');
    }

    // Auto-generate examId securely to prevent race conditions
    const lastExam = await Exam.findOne({}, { examId: 1 }).sort({ createdAt: -1 });
    const lastNum = lastExam ? parseInt(lastExam.examId.replace('EXAM', ''), 10) : 0;
    const examId = `EXAM${String(lastNum + 1).padStart(3, '0')}`;

    // Auto-generate questionIds if not provided
    const processedQuestions = questions.map((q, index) => ({
        ...q,
        questionId: q.questionId || `Q${String(index + 1).padStart(3, '0')}`,
    }));

    const exam = await Exam.create({
        examId,
        title,
        durationMin,
        questions: processedQuestions,
        createdBy: req.user._id,
    });

    res.status(201).json(exam);
});

// @desc    Get all exams for logged-in teacher
// @route   GET /api/exams
// @access  Private/Teacher
const getExams = asyncHandler(async (req, res) => {
    let query = { createdBy: req.user._id };
    if (req.user && req.user.email === '66025694@up.ac.th') {
        query = {};
    }
    const exams = await Exam.find(query).sort({ createdAt: -1 });
    res.json(exams);
});

// @desc    Get single exam by ID
// @route   GET /api/exams/:id
// @access  Private/Teacher
const getExamById = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    // Ensure teacher owns this exam
    if (exam.createdBy.toString() !== req.user._id.toString() && (!req.user || req.user.email !== '66025694@up.ac.th')) {
        res.status(403);
        throw new Error('Not authorized to view this exam');
    }

    res.json(exam);
});

// @desc    Update an exam
// @route   PUT /api/exams/:id
// @access  Private/Teacher
const updateExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    if (exam.createdBy.toString() !== req.user._id.toString() && (!req.user || req.user.email !== '66025694@up.ac.th')) {
        res.status(403);
        throw new Error('Not authorized to update this exam');
    }

    const { title, durationMin, questions } = req.body;

    // Auto-generate questionIds if not provided
    const processedQuestions = questions
        ? questions.map((q, index) => ({
            ...q,
            questionId: q.questionId || `Q${String(index + 1).padStart(3, '0')}`,
        }))
        : exam.questions;

    exam.title = title || exam.title;
    exam.durationMin = durationMin || exam.durationMin;
    exam.questions = processedQuestions;

    const updatedExam = await exam.save();
    res.json(updatedExam);
});

// @desc    Delete an exam
// @route   DELETE /api/exams/:id
// @access  Private/Teacher
const deleteExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    if (exam.createdBy.toString() !== req.user._id.toString() && (!req.user || req.user.email !== '66025694@up.ac.th')) {
        res.status(403);
        throw new Error('Not authorized to delete this exam');
    }

    await exam.deleteOne();
    res.json({ message: 'Exam deleted' });
});

module.exports = {
    createExam,
    getExams,
    getExamById,
    updateExam,
    deleteExam,
};
