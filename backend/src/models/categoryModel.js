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
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    joinCode: {
        type: String,
        unique: true,
        sparse: true
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Unique index for name per creator
categorySchema.index({ name: 1, createdBy: 1 }, { unique: true });

// Pre-save hook to generate unique 6-character joinCode
categorySchema.pre('save', async function () {
    if (!this.joinCode) {
        let code;
        let isUnique = false;
        let attempts = 0;
        const Category = mongoose.model('Category');
        while (!isUnique && attempts < 50) {
            const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const existing = await Category.findOne({ joinCode: code });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }
        if (!isUnique) {
            throw new Error('Failed to generate a unique join code');
        }
        this.joinCode = code;
    }
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
