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
        tabSwitch: { type: Boolean, default: false },
        windowBlur: { type: Boolean, default: false },
        copyPaste: { type: Boolean, default: false },
        rightClick: { type: Boolean, default: false },
        printScreen: { type: Boolean, default: false },
        devTools: { type: Boolean, default: false },
        forbiddenKeys: { type: Boolean, default: false },
    },
    maxCheatEvents: {
        type: Number,
        default: 1, // Suspend immediately on first violation
    },
    shuffleQuestions: {
        type: Boolean,
        default: false,
    },
    currentNonce: {
        type: String,
    },
    usedNonces: [{
        type: String,
    }],
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

const ExamSession = mongoose.model('ExamSession', examSessionSchema);

module.exports = ExamSession;
