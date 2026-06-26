const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['present', 'late', 'absent'],
        default: 'present',
    },
    checkedInAt: {
        type: Date,
        default: Date.now,
    },
    remark: {
        type: String,
        default: '',
    }
});

const attendanceSessionSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active',
    },
    qrRotateInterval: {
        type: Number,
        default: 10, // seconds
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
    absentCutoffAt: {
        type: Date,
        default: null,
    },
    records: [attendanceRecordSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

attendanceSessionSchema.index({ category: 1 });
attendanceSessionSchema.index({ createdBy: 1 });

const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);

module.exports = AttendanceSession;
