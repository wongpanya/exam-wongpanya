const mongoose = require('mongoose');

const testExamSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        default: 'ชุดข้อสอบจำลองทดสอบ AI',
    },
    description: {
        type: String,
        default: '',
    },
    durationMin: {
        type: Number,
        default: 30,
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
    defaultModels: [{
        provider: { type: String, default: 'gemini' },
        model: { type: String, default: 'gemini-2.5-flash' },
        label: { type: String, default: 'Gemini 2.5 Flash' },
    }],
    sessionCount: {
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

testExamSchema.index({ createdBy: 1, createdAt: -1 });

const TestExam = mongoose.model('TestExam', testExamSchema);

module.exports = TestExam;
