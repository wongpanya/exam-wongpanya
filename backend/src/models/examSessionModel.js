const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active',
    },
    qrRotateInterval: {
        type: Number,
        default: 10, // seconds
    },
    cheatConfig: {
        tabSwitch: { type: Boolean, default: true },
        windowBlur: { type: Boolean, default: true },
        copyPaste: { type: Boolean, default: true },
        rightClick: { type: Boolean, default: true },
        printScreen: { type: Boolean, default: true },
        devTools: { type: Boolean, default: true },
        forbiddenKeys: { type: Boolean, default: true },
    },
    maxCheatEvents: {
        type: Number,
        default: 1, // Suspend immediately on first violation
    },
    shuffleQuestions: {
        type: Boolean,
        default: false,
    },
    activeShortCode: {
        type: String,
        default: null,
    },
    shortCodeExpiresAt: {
        type: Date,
        default: null,
    },
    previousShortCode: {
        type: String,
        default: null,
    },
    previousShortCodeExpiresAt: {
        type: Date,
        default: null,
    },
    studentCount: {
        type: Number,
        default: 0,
    },
    submittedCount: {
        type: Number,
        default: 0,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    endedAt: {
        type: Date,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

examSessionSchema.index({ exam: 1, status: 1 });
examSessionSchema.index({ createdBy: 1 });

const ExamSession = mongoose.model('ExamSession', examSessionSchema);

module.exports = ExamSession;
