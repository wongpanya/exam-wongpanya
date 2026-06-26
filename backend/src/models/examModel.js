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
        required: true,
    },
    points: {
        type: Number,
        default: 1,
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
        type: String,
        default: 'ทั่วไป',
    },
}, {
    timestamps: true,
});

examSchema.index({ createdBy: 1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
