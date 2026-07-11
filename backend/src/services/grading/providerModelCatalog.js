const { ProviderError, classifyHttpError } = require('./errors');

const readJson = async (response) => {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch (error) {
        throw new ProviderError('Provider returned invalid model catalog JSON', {
            code: 'INVALID_JSON',
            retriable: false,
            statusCode: 502,
        });
    }
};

const assertResponse = (response, body, provider) => {
    if (response.ok) return;
    const upstreamMessage = body?.error?.message || body?.message
        || `${provider} rejected the API key or model request`;
    throw classifyHttpError(response.status, String(upstreamMessage).slice(0, 1000));
};

const listGeminiModels = async (apiKey, fetchImpl) => {
    const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        { headers: { Accept: 'application/json' } }
    );
    const body = await readJson(response);
    assertResponse(response, body, 'Gemini');
    return (body.models || [])
        .filter((model) => {
            const actions = model.supportedGenerationMethods || model.supportedActions || [];
            return actions.length === 0 || actions.includes('generateContent');
        })
        .map(model => ({
            modelId: model.baseModelId || String(model.name || '').replace(/^models\//, ''),
            displayName: model.displayName || model.baseModelId || String(model.name || '').replace(/^models\//, ''),
            contextLength: Number.isFinite(model.inputTokenLimit) ? model.inputTokenLimit : null,
        }))
        .filter(model => model.modelId);
};

const listOpenRouterModels = async (apiKey, fetchImpl) => {
    const response = await fetchImpl(
        'https://openrouter.ai/api/v1/models?output_modalities=text&supported_parameters=response_format',
        { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const body = await readJson(response);
    assertResponse(response, body, 'OpenRouter');
    return (body.data || []).map(model => ({
        modelId: model.id,
        displayName: model.name || model.id,
        contextLength: Number.isFinite(model.context_length) ? model.context_length : null,
    })).filter(model => model.modelId);
};

const listProviderModels = async (provider, apiKey, { fetchImpl = global.fetch } = {}) => {
    if (!fetchImpl) {
        throw new ProviderError('Fetch is unavailable', { code: 'PROVIDER_UNAVAILABLE', statusCode: 503 });
    }
    const normalizedKey = String(apiKey || '').trim();
    if (!normalizedKey) {
        throw new ProviderError('API key is required', { code: 'AUTHENTICATION_ERROR', statusCode: 400 });
    }

    let models;
    try {
        if (provider === 'gemini') models = await listGeminiModels(normalizedKey, fetchImpl);
        else if (provider === 'openrouter') models = await listOpenRouterModels(normalizedKey, fetchImpl);
        else throw new ProviderError('Unsupported provider', { code: 'UNSUPPORTED_PROVIDER', statusCode: 400 });
    } catch (error) {
        if (error instanceof ProviderError) throw error;
        throw new ProviderError('Could not reach the provider model catalog', {
            code: 'NETWORK_ERROR',
            retriable: true,
            statusCode: 503,
        });
    }

    const unique = new Map(models.map(model => [model.modelId, model]));
    const sorted = Array.from(unique.values())
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .slice(0, 1000);
    if (sorted.length === 0) {
        throw new ProviderError('No compatible text-generation models were returned for this API key', {
            code: 'NO_COMPATIBLE_MODELS',
            statusCode: 400,
        });
    }
    return sorted;
};

module.exports = { listProviderModels };
