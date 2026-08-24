const AIProvider = require('./aiProvider');
const { ProviderError } = require('../errors');
const { parseStrictJson, readResponseBody, assertOkResponse, mapFetchError } = require('./providerUtils');

const toGeminiResponseSchema = (value) => {
    if (Array.isArray(value)) return value.map(toGeminiResponseSchema);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value)
        .filter(([key]) => key !== 'additionalProperties')
        .map(([key, item]) => [key, toGeminiResponseSchema(item)]));
};

class GeminiProvider extends AIProvider {
    constructor({ apiKey, model, fetchImpl = global.fetch }) {
        super({ name: 'gemini', model });
        this.apiKey = apiKey;
        this.fetch = fetchImpl;
    }

    isConfigured() {
        return Boolean(this.apiKey && this.model && this.fetch);
    }

    async grade(request, { prompt, signal }) {
        if (!this.isConfigured()) {
            throw new ProviderError('Gemini is not configured', { code: 'PROVIDER_UNAVAILABLE' });
        }

        const startedAt = Date.now();
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
            const response = await this.fetch(endpoint, {
                method: 'POST',
                signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: prompt.system }] },
                    contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
                    generationConfig: {
                        temperature: 0,
                        responseMimeType: 'application/json',
                        responseSchema: toGeminiResponseSchema(prompt.responseSchema),
                    },
                }),
            });

            const body = await readResponseBody(response);
            assertOkResponse(response, body, this.name);
            const rawResponse = body?.candidates?.[0]?.content?.parts
                ?.map(part => part.text || '')
                .join('') || '';

            if (!rawResponse) {
                throw new ProviderError('Gemini returned no grade content', {
                    code: 'INVALID_JSON',
                    retriable: true,
                });
            }

            return {
                candidate: parseStrictJson(rawResponse),
                rawResponse,
                model: body.modelVersion || this.model,
                latencyMs: Date.now() - startedAt,
                inputTokens: body.usageMetadata?.promptTokenCount,
                outputTokens: body.usageMetadata?.candidatesTokenCount,
            };
        } catch (error) {
            throw mapFetchError(error);
        }
    }
}

module.exports = GeminiProvider;
