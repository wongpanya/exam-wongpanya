const { ProviderError, classifyHttpError } = require('../errors');

const parseStrictJson = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
        throw new ProviderError('Provider returned an empty response', {
            code: 'INVALID_JSON',
            retriable: true,
        });
    }

    try {
        return JSON.parse(value.trim());
    } catch (error) {
        throw new ProviderError('Provider returned invalid JSON', {
            code: 'INVALID_JSON',
            retriable: true,
        });
    }
};

const readResponseBody = async (response) => {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (error) {
        return { rawText: text.slice(0, 2000) };
    }
};

const assertOkResponse = (response, body, providerName) => {
    if (response.ok) return;
    const upstreamMessage = body?.error?.message || body?.message || `${providerName} returned HTTP ${response.status}`;
    throw classifyHttpError(response.status, String(upstreamMessage).slice(0, 1000));
};

const mapFetchError = (error) => {
    if (error instanceof ProviderError) return error;
    if (error?.name === 'AbortError') {
        return new ProviderError('Provider request timed out', {
            code: 'TIMEOUT',
            retriable: true,
            statusCode: 504,
        });
    }
    return new ProviderError('Provider network request failed', {
        code: 'NETWORK_ERROR',
        retriable: true,
        statusCode: 503,
    });
};

module.exports = { parseStrictJson, readResponseBody, assertOkResponse, mapFetchError };
