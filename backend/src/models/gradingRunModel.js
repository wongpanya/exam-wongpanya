const mongoose = require('mongoose');

const gradingRunSchema = new mongoose.Schema({
    operationId: { type: String, required: true, index: true },
    gradingResult: { type: mongoose.Schema.Types.ObjectId, ref: 'GradingResult', default: null },
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamAttempt', default: null },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
    questionId: { type: String, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    trigger: {
        type: String,
        enum: ['automatic', 'manual', 'regrade', 'test', 'rules-engine'],
        default: 'manual',
    },
    provider: { type: String, required: true },
    model: { type: String, default: '' },
    status: {
        type: String,
        enum: ['processing', 'succeeded', 'failed', 'unavailable'],
        required: true,
    },
    attemptNumber: { type: Number, required: true, min: 0 },
    promptVersion: { type: String, required: true },
    requestSnapshot: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
    rawResponse: { type: String, default: null, select: false },
    parsedResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    inputTokens: { type: Number, default: null },
    outputTokens: { type: Number, default: null },
    estimatedCost: { type: Number, default: null },
    latencyMs: { type: Number, default: null },
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
}, { timestamps: true });

gradingRunSchema.index(
    { operationId: 1, provider: 1, attemptNumber: 1 },
    { unique: true }
);
gradingRunSchema.index({ attempt: 1, questionId: 1, createdAt: -1 });
gradingRunSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('GradingRun', gradingRunSchema);
