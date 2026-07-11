const AIProviderCredential = require('../../models/aiProviderCredentialModel');
const AITeacherRouting = require('../../models/aiTeacherRoutingModel');
const aiConfig = require('../../config/aiConfig');
const { getEncryptionKey, encryptApiKey, decryptApiKey } = require('./credentialEncryption');
const { listProviderModels } = require('./providerModelCatalog');
const { GradingError } = require('./errors');

const PROVIDERS = ['gemini', 'openrouter'];

const serializeSetting = (provider, credential) => ({
    provider,
    configured: Boolean(credential),
    keyHint: credential?.keyHint || null,
    selectedModel: credential?.selectedModel || null,
    models: credential?.models || [],
    modelsFetchedAt: credential?.modelsFetchedAt || null,
});

const listTeacherProviderSettings = async (ownerId) => {
    const credentials = await AIProviderCredential.find({ owner: ownerId });
    const byProvider = new Map(credentials.map(item => [item.provider, item]));
    return PROVIDERS.map(provider => serializeSetting(provider, byProvider.get(provider)));
};

const getTeacherRouting = async (ownerId, credentials = null) => {
    const [routing, availableCredentials] = await Promise.all([
        AITeacherRouting.findOne({ owner: ownerId }),
        credentials ? Promise.resolve(credentials) : AIProviderCredential.find({ owner: ownerId }),
    ]);
    const configured = new Set(availableCredentials.map(item => item.provider));
    const primaryProvider = configured.has(routing?.primaryProvider)
        ? routing.primaryProvider
        : (configured.has(aiConfig.primaryProvider) ? aiConfig.primaryProvider : PROVIDERS.find(provider => configured.has(provider)) || aiConfig.primaryProvider);
    return {
        primaryProvider,
        fallbackProviders: PROVIDERS.filter(provider => provider !== primaryProvider && configured.has(provider)),
    };
};

const setTeacherPrimaryProvider = async (ownerId, provider) => {
    const credential = await AIProviderCredential.findOne({ owner: ownerId, provider });
    if (!credential) {
        throw new GradingError('Configure an API key for this provider before making it primary', {
            code: 'CREDENTIAL_NOT_FOUND',
            statusCode: 400,
        });
    }
    await AITeacherRouting.findOneAndUpdate(
        { owner: ownerId },
        { $set: { primaryProvider: provider }, $setOnInsert: { owner: ownerId } },
        { upsert: true, returnDocument: 'after', runValidators: true }
    );
    return getTeacherRouting(ownerId);
};

const saveTeacherApiKey = async (ownerId, provider, apiKey, { fetchImpl = global.fetch } = {}) => {
    getEncryptionKey();
    const cleanKey = String(apiKey || '').trim();
    const models = await listProviderModels(provider, cleanKey, { fetchImpl });
    const existing = await AIProviderCredential.findOne({ owner: ownerId, provider });
    const selectedModel = existing && models.some(model => model.modelId === existing.selectedModel)
        ? existing.selectedModel
        : models[0].modelId;
    const encrypted = encryptApiKey(cleanKey);
    const credential = await AIProviderCredential.findOneAndUpdate(
        { owner: ownerId, provider },
        {
            $set: {
                ...encrypted,
                keyHint: cleanKey.slice(-4),
                selectedModel,
                models,
                modelsFetchedAt: new Date(),
            },
            $setOnInsert: { owner: ownerId, provider },
        },
        { upsert: true, returnDocument: 'after', runValidators: true }
    );
    return serializeSetting(provider, credential);
};

const refreshTeacherModels = async (ownerId, provider, { fetchImpl = global.fetch } = {}) => {
    const credential = await AIProviderCredential.findOne({ owner: ownerId, provider })
        .select('+encryptedApiKey +iv +authTag');
    if (!credential) throw new GradingError('Provider API key is not configured', { code: 'CREDENTIAL_NOT_FOUND', statusCode: 404 });
    const apiKey = decryptApiKey(credential);
    const models = await listProviderModels(provider, apiKey, { fetchImpl });
    credential.models = models;
    if (!models.some(model => model.modelId === credential.selectedModel)) {
        credential.selectedModel = models[0].modelId;
    }
    credential.modelsFetchedAt = new Date();
    await credential.save();
    return serializeSetting(provider, credential);
};

const selectTeacherModel = async (ownerId, provider, modelId) => {
    const credential = await AIProviderCredential.findOne({ owner: ownerId, provider });
    if (!credential) throw new GradingError('Provider API key is not configured', { code: 'CREDENTIAL_NOT_FOUND', statusCode: 404 });
    if (!credential.models.some(model => model.modelId === modelId)) {
        throw new GradingError('The selected model is not available for this teacher API key', {
            code: 'MODEL_NOT_AVAILABLE',
            statusCode: 400,
        });
    }
    credential.selectedModel = modelId;
    await credential.save();
    return serializeSetting(provider, credential);
};

const deleteTeacherCredential = async (ownerId, provider) => {
    await AIProviderCredential.deleteOne({ owner: ownerId, provider });
};

const getTeacherProviderCredentials = async (ownerId, { preferredProvider = 'system', preferredModel = '' } = {}) => {
    if (!ownerId) {
        throw new GradingError('The grading credential owner is missing', {
            code: 'CREDENTIAL_OWNER_MISSING',
            statusCode: 500,
        });
    }
    const credentials = await AIProviderCredential.find({ owner: ownerId })
        .select('+encryptedApiKey +iv +authTag');
    const routing = await getTeacherRouting(ownerId, credentials);
    const modelProvider = preferredProvider === 'system' ? routing.primaryProvider : preferredProvider;
    const resolved = {};
    for (const credential of credentials) {
        if (credential.provider === modelProvider && preferredModel
            && !credential.models.some(model => model.modelId === preferredModel)) {
            throw new GradingError('The selected model is not available for this teacher API key', {
                code: 'MODEL_NOT_AVAILABLE',
                statusCode: 400,
            });
        }
        const requestedModelAllowed = credential.provider === modelProvider
            && preferredModel
            && credential.models.some(model => model.modelId === preferredModel);
        resolved[credential.provider] = {
            apiKey: decryptApiKey(credential),
            model: requestedModelAllowed ? preferredModel : credential.selectedModel,
        };
    }
    return {
        routing,
        gemini: resolved.gemini || { apiKey: '', model: '' },
        openrouter: {
            ...(resolved.openrouter || { apiKey: '', model: '' }),
            referer: aiConfig.openrouter.referer,
            appName: aiConfig.openrouter.appName,
        },
    };
};

module.exports = {
    PROVIDERS,
    listTeacherProviderSettings,
    getTeacherRouting,
    setTeacherPrimaryProvider,
    saveTeacherApiKey,
    refreshTeacherModels,
    selectTeacherModel,
    deleteTeacherCredential,
    getTeacherProviderCredentials,
};
