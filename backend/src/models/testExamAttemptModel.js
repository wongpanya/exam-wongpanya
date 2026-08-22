const mongoose = require('mongoose');

const testExamAttemptSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestExamSession',
        required: true,
        index: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    studentInfo: {
        firstName: { type: String, default: '' },
        lastName: { type: String, default: '' },
        email: { type: String, default: '' },
    },
    answers: [{
        questionId: { type: String, required: true },
        selectedAnswer: { type: String, default: '' },
    }],
    gradingStatus: {
        type: String,
        enum: ['pending', 'grading', 'completed', 'failed'],
        default: 'grading',
    },
    evaluations: [{
        questionId: { type: String, required: true },
        modelEvaluations: [{
            provider: { type: String, required: true },
            model: { type: String, required: true },
            label: { type: String, required: true },
            status: { type: String, enum: ['succeeded', 'failed'], default: 'succeeded' },
            totalScore: { type: Number, default: 0 },
            rubricScores: [{
                rubricId: String,
                score: Number,
                feedback: String,
                evidence: String,
            }],
            feedback: { type: String, default: '' },
            confidence: { type: Number, default: 1 },
            latencyMs: { type: Number, default: 0 },
            inputTokens: { type: Number, default: 0 },
            outputTokens: { type: Number, default: 0 },
            estimatedCost: { type: Number, default: 0 },
            error: { type: String, default: '' },
        }],
    }],
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

testExamAttemptSchema.index({ session: 1, student: 1 }, { unique: true });
testExamAttemptSchema.index({ session: 1, createdAt: -1 });

const TestExamAttempt = mongoose.model('TestExamAttempt', testExamAttemptSchema);

module.exports = TestExamAttempt;
