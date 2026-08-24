const AIProvider = require('./aiProvider');
const { ProviderError } = require('../errors');
const { parseStrictJson, readResponseBody, assertOkResponse, mapFetchError } = require('./providerUtils');

class OpenRouterProvider extends AIProvider {
    constructor({ apiKey, model, maxOutputTokens = 2048, referer = '', appName = '', fetchImpl = global.fetch }) {
        super({ name: 'openrouter', model });
        this.apiKey = apiKey;
        this.maxOutputTokens = maxOutputTokens;
        this.referer = referer;
        this.appName = appName;
        this.fetch = fetchImpl;
    }

    isConfigured() {
        return Boolean(this.apiKey && this.model && this.fetch);
    }

    async grade(request, { prompt, signal }) {
        if (!this.isConfigured()) {
            throw new ProviderError('OpenRouter is not configured', { code: 'PROVIDER_UNAVAILABLE' });
        }

        const startedAt = Date.now();
        try {
            const headers = {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            };
            if (this.referer) headers['HTTP-Referer'] = this.referer;
            if (this.appName) headers['X-OpenRouter-Title'] = this.appName;

            const response = await this.fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                signal,
                headers,
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: `${prompt.system}\n\nReturn one JSON object that exactly matches this schema:\n${JSON.stringify(prompt.responseSchema)}`,
                        },
                        { role: 'user', content: prompt.user },
                    ],
                    temperature: 0,
                    max_tokens: this.maxOutputTokens,
                    stream: false,
                    response_format: {
                        // More OpenRouter models support JSON mode than strict JSON Schema.
                        // The server still validates the full rubric shape before accepting it.
                        type: 'json_object',
                    },
                }),
            });

            const body = await readResponseBody(response);
            assertOkResponse(response, body, this.name);
            const choice = body?.choices?.[0];
            if (choice?.error || choice?.finish_reason === 'error') {
                throw new ProviderError(
                    String(choice?.error?.message || 'OpenRouter upstream provider failed').slice(0, 1000),
                    { code: 'PROVIDER_UNAVAILABLE', retriable: true }
                );
            }

            const content = choice?.message?.content;
            const rawResponse = Array.isArray(content)
                ? content.map(item => item?.text || '').join('')
                : String(content || '');

            return {
                candidate: parseStrictJson(rawResponse),
                rawResponse,
                model: body.model || this.model,
                latencyMs: Date.now() - startedAt,
                inputTokens: body.usage?.prompt_tokens ?? body.usage?.input_tokens,
                outputTokens: body.usage?.completion_tokens ?? body.usage?.output_tokens,
                estimatedCost: body.usage?.cost,
            };
        } catch (error) {
            throw mapFetchError(error);
        }
    }
}

module.exports = OpenRouterProvider;
