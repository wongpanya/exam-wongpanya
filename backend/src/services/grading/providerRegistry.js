const aiConfig = require('../../config/aiConfig');
const GeminiProvider = require('./providers/geminiProvider');
const OpenRouterProvider = require('./providers/openRouterProvider');

const createProviderRegistry = ({ credentials = {}, config = aiConfig, fetchImpl = global.fetch } = {}) => {
    const gemini = credentials.gemini || { apiKey: '', model: '' };
    const openrouter = credentials.openrouter || { apiKey: '', model: '' };
    return new Map([
        ['gemini', new GeminiProvider({
            apiKey: gemini.apiKey,
            model: gemini.model,
            fetchImpl,
        })],
        ['openrouter', new OpenRouterProvider({
            apiKey: openrouter.apiKey,
            model: openrouter.model,
            maxOutputTokens: config.maxOutputTokens,
            referer: openrouter.referer || config.openrouter.referer,
            appName: openrouter.appName || config.openrouter.appName,
            fetchImpl,
        })],
    ]);
};

module.exports = { createProviderRegistry };
