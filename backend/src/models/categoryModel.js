const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, {
    timestamps: true
});

// Unique index for name per creator
categorySchema.index({ name: 1, createdBy: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
