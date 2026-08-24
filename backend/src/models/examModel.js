const mongoose = require('mongoose');

const choiceSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
}, { _id: false });

const rubricCriterionSchema = new mongoose.Schema({
    rubricId: {
        type: String,
        required: true,
        trim: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    maxScore: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });

const aiGradingSchema = new mongoose.Schema({
    groundTruths: {
        type: [String],
        default: [],
    },
    rubricCriteria: {
        type: [rubricCriterionSchema],
        default: [],
    },
    keyConcepts: {
        type: [String],
        default: [],
    },
    language: {
        type: String,
        enum: ['th', 'en'],
        default: 'th',
    },
    providerPreference: {
        type: String,
        enum: ['system', 'gemini', 'openrouter'],
        default: 'system',
    },
    modelPreference: {
        type: String,
        default: '',
        maxlength: 300,
    },
}, { _id: false });

const questionSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['radio', 'checkbox', 'text'],
        default: 'radio',
    },
    prompt: {
        type: String,
        required: true,
    },
    choices: [choiceSchema],
    correctAnswer: {
        type: String,
        default: '',
    },
    points: {
        type: Number,
        default: 1,
    },
    gradingMode: {
        type: String,
        enum: ['exact', 'ai'],
        default: 'exact',
    },
    aiGrading: {
        type: aiGradingSchema,
        default: () => ({}),
    },
}, { _id: false });

const examSchema = new mongoose.Schema({
    examId: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
    },
    durationMin: {
        type: Number,
        required: true,
    },
    questions: [questionSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null, // null means general exam (ข้อสอบทั่วไป)
    },
}, {
    timestamps: true,
});

examSchema.index({ createdBy: 1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
