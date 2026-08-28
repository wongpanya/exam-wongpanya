const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
    },
    selectedAnswer: {
        type: String,
        default: '',
    },
}, { _id: false });

const choiceOrderSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
    },
    choiceValues: {
        type: [String],
        default: [],
    },
}, { _id: false });

const examAttemptSchema = new mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSession',
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    questionOrder: [{
        type: String // store randomized questionIds
    }],
    choiceOrder: [choiceOrderSchema],
    answers: [answerSchema],
    score: {
        type: Number,
        default: null,
    },
    objectiveScore: {
        type: Number,
        default: 0,
    },
    aiScore: {
        type: Number,
        default: null,
    },
    teacherScore: {
        type: Number,
        default: null,
    },
    finalScore: {
        type: Number,
        default: null,
    },
    gradingStatus: {
        type: String,
        enum: ['not-required', 'pending', 'processing', 'completed', 'needs-review', 'failed'],
        default: 'not-required',
    },
    totalPoints: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['in-progress', 'submitted', 'suspended'],
        default: 'in-progress',
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    submittedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// One student can only have one attempt per session
examAttemptSchema.index({ session: 1, student: 1 }, { unique: true });
examAttemptSchema.index({ gradingStatus: 1, updatedAt: 1 });

const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);

module.exports = ExamAttempt;
