const mongoose = require('mongoose');

const aiTeacherRoutingSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    primaryProvider: {
        type: String,
        enum: ['gemini', 'openrouter'],
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('AITeacherRouting', aiTeacherRoutingSchema);
