const mongoose = require('mongoose');

const cheatingLogSchema = new mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSession',
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    eventType: {
        type: String,
        enum: [
            'tab_switch',
            'blur',
            'focus',
            'copy',
            'cut',
            'paste',
            'right_click',
            'print_screen',
            'devtools',
            'forbidden_key',
        ],
        required: true,
    },
    detail: {
        type: String,
        default: '',
    },
    isResolved: {
        type: Boolean,
        default: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
});

cheatingLogSchema.index({ session: 1, student: 1 });
cheatingLogSchema.index({ session: 1, eventType: 1 });

const CheatingLog = mongoose.model('CheatingLog', cheatingLogSchema);

module.exports = CheatingLog;
