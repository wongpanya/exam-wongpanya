const mongoose = require('mongoose');

const scoreSnapshotSchema = new mongoose.Schema({
    aiScore: { type: Number, default: null },
    teacherScore: { type: Number, default: null },
    finalScore: { type: Number, default: null },
    status: { type: String, default: '' },
}, { _id: false });

const gradingReviewLogSchema = new mongoose.Schema({
    gradingResult: { type: mongoose.Schema.Types.ObjectId, ref: 'GradingResult', required: true },
    gradingRun: { type: mongoose.Schema.Types.ObjectId, ref: 'GradingRun', default: null },
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamAttempt', required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    questionId: { type: String, required: true },
    action: {
        type: String,
        enum: ['confirmed', 'adjusted', 'regrade-requested', 'regrade-completed'],
        required: true,
    },
    before: { type: scoreSnapshotSchema, required: true },
    after: { type: scoreSnapshotSchema, required: true },
    reason: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

gradingReviewLogSchema.index({ gradingResult: 1, createdAt: -1 });
gradingReviewLogSchema.index({ attempt: 1, questionId: 1, createdAt: -1 });

module.exports = mongoose.model('GradingReviewLog', gradingReviewLogSchema);
