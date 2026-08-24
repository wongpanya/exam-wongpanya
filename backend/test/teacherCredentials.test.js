const test = require('node:test');
const assert = require('node:assert/strict');

const { encryptApiKey, decryptApiKey } = require('../src/services/grading/credentialEncryption');
const { listProviderModels } = require('../src/services/grading/providerModelCatalog');
const { createProviderRegistry } = require('../src/services/grading/providerRegistry');

const response = body => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
});

test('teacher API keys are encrypted at rest and can be decrypted with the server secret', () => {
    const previous = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
    process.env.AI_CREDENTIALS_ENCRYPTION_KEY = 'test-only-encryption-secret-that-is-long-enough';
    try {
        const encrypted = encryptApiKey('teacher-secret-key');
        assert.notEqual(encrypted.encryptedApiKey, 'teacher-secret-key');
        assert.equal(decryptApiKey(encrypted), 'teacher-secret-key');
    } finally {
        if (previous === undefined) delete process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
        else process.env.AI_CREDENTIALS_ENCRYPTION_KEY = previous;
    }
});

test('Gemini model catalog keeps models that support generateContent', async () => {
    let request;
    const models = await listProviderModels('gemini', 'teacher-key', {
        fetchImpl: async (url, options) => {
            request = { url, options };
            return response({ models: [
                { name: 'models/gemini-b', displayName: 'Gemini B', supportedGenerationMethods: ['generateContent'], inputTokenLimit: 1000 },
                { name: 'models/embedding', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] },
                { name: 'models/gemini-a', baseModelId: 'gemini-a', displayName: 'Gemini A' },
            ] });
        },
    });

    assert.deepEqual(models.map(item => item.modelId), ['gemini-a', 'gemini-b']);
    assert.match(request.url, /[?&]key=teacher-key$/);
});

test('OpenRouter model catalog uses the teacher bearer key and normalizes models', async () => {
    let authorization;
    const models = await listProviderModels('openrouter', 'teacher-key', {
        fetchImpl: async (_url, options) => {
            authorization = options.headers.Authorization;
            return response({ data: [{ id: 'vendor/model', name: 'Model', context_length: 32000 }] });
        },
    });

    assert.equal(authorization, 'Bearer teacher-key');
    assert.deepEqual(models, [{ modelId: 'vendor/model', displayName: 'Model', contextLength: 32000 }]);
});

test('provider registry is configured only from the supplied teacher credentials', () => {
    const registry = createProviderRegistry({
        credentials: {
            gemini: { apiKey: 'teacher-gemini-key', model: 'gemini-model' },
            openrouter: { apiKey: '', model: '' },
        },
    });

    assert.equal(registry.get('gemini').isConfigured(), true);
    assert.equal(registry.get('gemini').model, 'gemini-model');
    assert.equal(registry.get('openrouter').isConfigured(), false);
});
