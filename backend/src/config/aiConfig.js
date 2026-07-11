const SUPPORTED_PROVIDERS = ['gemini', 'openrouter'];

const parseInteger = (name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
    const value = Number.parseInt(process.env[name], 10);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
};

const parseNumber = (name, fallback, { min = 0, max = Number.MAX_VALUE } = {}) => {
    const value = Number.parseFloat(process.env[name]);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
};

const parseBoolean = (name, fallback = false) => {
    const value = process.env[name];
    if (value === undefined) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseProviderList = (value) => String(value || '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter((item, index, list) => SUPPORTED_PROVIDERS.includes(item) && list.indexOf(item) === index);

const primaryProvider = SUPPORTED_PROVIDERS.includes(String(process.env.AI_PRIMARY_PROVIDER || '').toLowerCase())
    ? String(process.env.AI_PRIMARY_PROVIDER).toLowerCase()
    : 'gemini';

const fallbackProviders = parseProviderList(process.env.AI_FALLBACK_PROVIDERS || 'openrouter')
    .filter(provider => provider !== primaryProvider);

const aiConfig = Object.freeze({
    supportedProviders: SUPPORTED_PROVIDERS,
    primaryProvider,
    fallbackProviders,
    timeoutMs: parseInteger('AI_TIMEOUT_MS', 30000, { min: 1000, max: 120000 }),
    maxRetries: parseInteger('AI_MAX_RETRIES', 2, { min: 0, max: 5 }),
    retryBaseDelayMs: parseInteger('AI_RETRY_BASE_DELAY_MS', 250, { min: 0, max: 10000 }),
    reviewConfidenceThreshold: parseNumber('AI_REVIEW_CONFIDENCE_THRESHOLD', 0.7, { min: 0, max: 1 }),
    scoreDisagreementThreshold: parseNumber('AI_SCORE_DISAGREEMENT_THRESHOLD', 2, { min: 0 }),
    highScoreWithoutEvidenceRatio: parseNumber('AI_HIGH_SCORE_WITHOUT_EVIDENCE_RATIO', 0.7, { min: 0, max: 1 }),
    maxAnswerChars: parseInteger('AI_MAX_ANSWER_CHARS', 12000, { min: 100, max: 50000 }),
    maxOutputTokens: parseInteger('AI_MAX_OUTPUT_TOKENS', 2048, { min: 128, max: 16000 }),
    maxRegradesPerAnswer: parseInteger('AI_MAX_REGRADES_PER_ANSWER', 5, { min: 0, max: 50 }),
    storeRawResponses: parseBoolean('AI_STORE_RAW_RESPONSES', false),
    maxRawResponseChars: parseInteger('AI_MAX_RAW_RESPONSE_CHARS', 50000, { min: 0, max: 250000 }),
    workerPollMs: parseInteger('AI_GRADING_WORKER_POLL_MS', 3000, { min: 500, max: 60000 }),
    workerLockMs: parseInteger('AI_GRADING_WORKER_LOCK_MS', 600000, { min: 30000, max: 900000 }),
    openrouter: Object.freeze({
        referer: process.env.OPENROUTER_SITE_URL || '',
        appName: process.env.OPENROUTER_APP_NAME || 'Exam AI Grading',
    }),
});

module.exports = aiConfig;
