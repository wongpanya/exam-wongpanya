const test = require('node:test');
const assert = require('node:assert/strict');

const AIRouter = require('../src/services/grading/aiRouter');
const {
    ProviderError,
    AllProvidersFailedError,
    classifyHttpError,
} = require('../src/services/grading/errors');
const { parseStrictJson } = require('../src/services/grading/providers/providerUtils');

const makeRequest = () => ({
    question: 'Explain photosynthesis.',
    groundTruths: ['Plants convert light energy into chemical energy.'],
    studentAnswer: 'Plants use sunlight to make glucose.',
    rubric: [{
        id: 'concept',
        title: 'Core concept',
        description: 'Explains the role of sunlight.',
        maxScore: 10,
    }],
    keyConcepts: ['sunlight', 'glucose'],
    maxScore: 10,
    language: 'en',
});

const makeCandidate = () => ({
    totalScore: 10,
    maxScore: 10,
    criteria: [{
        rubricId: 'concept',
        score: 10,
        maxScore: 10,
        evidence: ['sunlight'],
        reason: 'The answer identifies sunlight.',
    }],
    detectedConcepts: ['sunlight', 'glucose'],
    missingConcepts: [],
    confidence: 0.95,
    needsHumanReview: false,
    reviewReason: '',
});

const makeConfig = (overrides = {}) => ({
    primaryProvider: 'primary',
    fallbackProviders: ['fallback'],
    timeoutMs: 100,
    maxRetries: 0,
    retryBaseDelayMs: 0,
    reviewConfidenceThreshold: 0.7,
    highScoreWithoutEvidenceRatio: 0.7,
    scoreDisagreementThreshold: 2,
    ...overrides,
});

const successResponse = (model = 'model-v1') => ({
    candidate: makeCandidate(),
    rawResponse: '{"grade":"ok"}',
    model,
    latencyMs: 1,
});

test('AIRouter skips an unhealthy primary provider and succeeds with its fallback', async () => {
    let primaryGradeCalls = 0;
    const providers = new Map([
        ['primary', {
            model: 'primary-model',
            healthCheck: async () => false,
            grade: async () => {
                primaryGradeCalls += 1;
                throw new Error('unreachable');
            },
        }],
        ['fallback', {
            model: 'fallback-model',
            healthCheck: async () => true,
            grade: async () => successResponse('fallback-model'),
        }],
    ]);
    const router = new AIRouter({ providers, config: makeConfig() });

    const outcome = await router.grade(makeRequest());

    assert.equal(primaryGradeCalls, 0);
    assert.equal(outcome.result.metadata.provider, 'fallback');
    assert.equal(outcome.attempts[0].status, 'unavailable');
    assert.equal(outcome.attempts[1].status, 'succeeded');
});

test('AIRouter records a timeout, aborts the signal, and reports all providers failed', async () => {
    let aborted = false;
    const providers = new Map([['primary', {
        model: 'slow-model',
        healthCheck: async () => true,
        grade: async (_request, { signal }) => new Promise(() => {
            signal.addEventListener('abort', () => {
                aborted = true;
            }, { once: true });
        }),
    }]]);
    const router = new AIRouter({
        providers,
        config: makeConfig({ fallbackProviders: [], timeoutMs: 10 }),
    });

    await assert.rejects(
        router.grade(makeRequest()),
        error => error instanceof AllProvidersFailedError
            && error.attempts.length === 1
            && error.attempts[0].error.code === 'TIMEOUT'
    );
    assert.equal(aborted, true);
});

test('AIRouter falls back after an invalid-JSON ProviderError', async () => {
    const providers = new Map([
        ['primary', {
            model: 'bad-json-model',
            healthCheck: async () => true,
            grade: async () => {
                parseStrictJson('{not valid JSON');
            },
        }],
        ['fallback', {
            model: 'fallback-model',
            healthCheck: async () => true,
            grade: async () => successResponse('fallback-model'),
        }],
    ]);
    const router = new AIRouter({ providers, config: makeConfig({ maxRetries: 0 }) });

    const outcome = await router.grade(makeRequest());

    assert.equal(outcome.attempts[0].status, 'failed');
    assert.equal(outcome.attempts[0].error.code, 'INVALID_JSON');
    assert.equal(outcome.result.metadata.provider, 'fallback');
});

test('AIRouter retries a retriable ProviderError and then succeeds', async () => {
    let gradeCalls = 0;
    const sleepDelays = [];
    const providers = new Map([['primary', {
        model: 'flaky-model',
        healthCheck: async () => true,
        grade: async () => {
            gradeCalls += 1;
            if (gradeCalls === 1) {
                throw new ProviderError('temporary outage', {
                    code: 'NETWORK_ERROR',
                    retriable: true,
                    statusCode: 503,
                });
            }
            return successResponse('flaky-model');
        },
    }]]);
    const router = new AIRouter({
        providers,
        config: makeConfig({
            fallbackProviders: [],
            maxRetries: 1,
            retryBaseDelayMs: 7,
        }),
        sleep: async delay => sleepDelays.push(delay),
    });

    const outcome = await router.grade(makeRequest());

    assert.equal(gradeCalls, 2);
    assert.deepEqual(sleepDelays, [7]);
    assert.deepEqual(outcome.attempts.map(item => item.status), ['failed', 'succeeded']);
});

test('AIRouter does not retry an authentication ProviderError', async () => {
    let gradeCalls = 0;
    let sleepCalls = 0;
    const providers = new Map([['primary', {
        model: 'auth-failure-model',
        healthCheck: async () => true,
        grade: async () => {
            gradeCalls += 1;
            throw classifyHttpError(401, 'invalid API key');
        },
    }]]);
    const router = new AIRouter({
        providers,
        config: makeConfig({ fallbackProviders: [], maxRetries: 3 }),
        sleep: async () => {
            sleepCalls += 1;
        },
    });

    await assert.rejects(
        router.grade(makeRequest()),
        error => error instanceof AllProvidersFailedError
            && error.attempts.length === 1
            && error.attempts[0].error.code === 'AUTHENTICATION_ERROR'
    );
    assert.equal(gradeCalls, 1);
    assert.equal(sleepCalls, 0);
});
