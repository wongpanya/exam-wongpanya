const mongoose = require('mongoose');

const testExamSessionSchema = new mongoose.Schema({
    testExam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestExam',
        default: null,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        default: 'ห้องสอบจำลองทดสอบโมเดล AI',
    },
    description: {
        type: String,
        default: '',
    },
    durationMin: {
        type: Number,
        default: 30,
    },
    autoStopAt: {
        type: Date,
        default: null,
    },
    questions: [{
        questionId: { type: String, required: true },
        type: { type: String, enum: ['text', 'radio', 'checkbox'], default: 'text' },
        prompt: { type: String, required: true },
        choices: [{
            value: String,
            label: String,
        }],
        correctAnswer: { type: String, default: '' },
        points: { type: Number, default: 5 },
        gradingMode: { type: String, enum: ['ai', 'exact'], default: 'ai' },
        aiGrading: {
            groundTruths: [String],
            rubricCriteria: [{
                rubricId: String,
                title: String,
                description: String,
                maxScore: Number,
            }],
            keyConcepts: [String],
            language: { type: String, default: 'th' },
            providerPreference: { type: String, default: 'system' },
            modelPreference: { type: String, default: '' },
        },
    }],
    modelsToCompare: [{
        provider: { type: String, required: true },
        model: { type: String, required: true },
        label: { type: String, required: true },
    }],
    shortCode: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active',
    },
    studentCount: {
        type: Number,
        default: 0,
    },
    submittedCount: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

testExamSessionSchema.index({ createdBy: 1, createdAt: -1 });
testExamSessionSchema.index({ testExam: 1, createdAt: -1 });

const TestExamSession = mongoose.model('TestExamSession', testExamSessionSchema);

module.exports = TestExamSession;
