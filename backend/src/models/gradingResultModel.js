const mongoose = require('mongoose');

const criterionResultSchema = new mongoose.Schema({
    rubricId: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    evidence: { type: [String], default: [] },
    reason: { type: String, required: true },
}, { _id: false });

const ruleDecisionSchema = new mongoose.Schema({
    rule: { type: String, required: true },
    action: { type: String, required: true },
    reason: { type: String, required: true },
}, { _id: false });

const gradingResultSchema = new mongoose.Schema({
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamAttempt', required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    questionId: { type: String, required: true },
    requestSnapshot: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
    providerPreference: {
        type: String,
        enum: ['system', 'gemini', 'openrouter'],
        default: 'system',
    },
    modelPreference: { type: String, default: '', maxlength: 300 },
    credentialOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    selectedRun: { type: mongoose.Schema.Types.ObjectId, ref: 'GradingRun', default: null },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'needs-review', 'reviewed', 'failed'],
        default: 'pending',
    },
    aiScore: { type: Number, default: null },
    teacherScore: { type: Number, default: null },
    finalScore: { type: Number, default: null },
    maxScore: { type: Number, required: true },
    criteria: { type: [criterionResultSchema], default: [] },
    detectedConcepts: { type: [String], default: [] },
    missingConcepts: { type: [String], default: [] },
    confidence: { type: Number, default: null },
    needsHumanReview: { type: Boolean, default: false },
    reviewReason: { type: String, default: '' },
    provider: { type: String, default: '' },
    model: { type: String, default: '' },
    latencyMs: { type: Number, default: null },
    inputTokens: { type: Number, default: null },
    outputTokens: { type: Number, default: null },
    estimatedCost: { type: Number, default: null },
    rulesDecisions: { type: [ruleDecisionSchema], default: [] },
    regradeCount: { type: Number, default: 0 },
    lastError: {
        code: { type: String, default: null },
        message: { type: String, default: null },
        at: { type: Date, default: null },
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    trigger: { type: String, default: 'automatic' },
    operationId: { type: String, default: null },
    lockId: { type: String, default: null },
    lockExpiresAt: { type: Date, default: null },
    gradedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, optimisticConcurrency: true });

gradingResultSchema.index({ attempt: 1, questionId: 1 }, { unique: true });
gradingResultSchema.index({ status: 1, lockExpiresAt: 1, createdAt: 1 });
gradingResultSchema.index({ exam: 1, needsHumanReview: 1, updatedAt: -1 });

module.exports = mongoose.model('GradingResult', gradingResultSchema);
