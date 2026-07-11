const mongoose = require('mongoose');

const providerModelSchema = new mongoose.Schema({
    modelId: { type: String, required: true },
    displayName: { type: String, required: true },
    contextLength: { type: Number, default: null },
}, { _id: false });

const aiProviderCredentialSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    provider: {
        type: String,
        enum: ['gemini', 'openrouter'],
        required: true,
    },
    encryptedApiKey: {
        type: String,
        required: true,
        select: false,
    },
    iv: {
        type: String,
        required: true,
        select: false,
    },
    authTag: {
        type: String,
        required: true,
        select: false,
    },
    keyHint: {
        type: String,
        required: true,
    },
    selectedModel: {
        type: String,
        required: true,
    },
    models: {
        type: [providerModelSchema],
        default: [],
    },
    modelsFetchedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

aiProviderCredentialSchema.index({ owner: 1, provider: 1 }, { unique: true });
aiProviderCredentialSchema.index({ owner: 1, updatedAt: -1 });

module.exports = mongoose.model('AIProviderCredential', aiProviderCredentialSchema);
