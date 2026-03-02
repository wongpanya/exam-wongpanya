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
    answers: [answerSchema],
    score: {
        type: Number,
        default: null,
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

const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);

module.exports = ExamAttempt;
