const asyncHandler = require('express-async-handler');
const ExamAttempt = require('../models/examAttemptModel');
const Exam = require('../models/examModel');
const GradingResult = require('../models/gradingResultModel');

const PRIVILEGED_EMAIL = '66025694@up.ac.th';

const isPrivilegedReviewer = user => Boolean(
    user && (['admin', 'dev'].includes(user.role) || user.email === PRIVILEGED_EMAIL)
);

const gradingReviewer = (req, res, next) => {
    if (req.user && (req.user.role === 'teacher' || isPrivilegedReviewer(req.user))) return next();
    res.status(403);
    throw new Error('Not authorized to review grading');
};

const canManageExam = (user, exam) => Boolean(
    user && exam && (isPrivilegedReviewer(user) || String(exam.createdBy) === String(user._id))
);

const loadOwnedAnswer = asyncHandler(async (req, res, next) => {
    const { attemptId, questionId } = req.params;
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
        res.status(404);
        throw new Error('Attempt not found');
    }

    const exam = await Exam.findById(attempt.exam);
    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }
    if (!canManageExam(req.user, exam)) {
        res.status(403);
        throw new Error('Not authorized to access this answer');
    }

    const question = exam.questions.find(item => item.questionId === questionId);
    if (!question) {
        res.status(404);
        throw new Error('Question not found');
    }
    const answer = attempt.answers.find(item => item.questionId === questionId)
        || { questionId, selectedAnswer: '' };

    req.gradingContext = { attempt, exam, question, answer };
    next();
});

const loadOwnedGradingResult = asyncHandler(async (req, res, next) => {
    const result = await GradingResult.findOne({
        attempt: req.params.attemptId,
        questionId: req.params.questionId,
    });
    if (!result) {
        res.status(404);
        throw new Error('Grading result not found');
    }
    req.gradingResult = result;
    next();
});

module.exports = {
    PRIVILEGED_EMAIL,
    isPrivilegedReviewer,
    gradingReviewer,
    canManageExam,
    loadOwnedAnswer,
    loadOwnedGradingResult,
};
