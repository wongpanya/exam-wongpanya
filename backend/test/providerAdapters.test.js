const test = require('node:test');
const assert = require('node:assert/strict');

const GeminiProvider = require('../src/services/grading/providers/geminiProvider');
const OpenRouterProvider = require('../src/services/grading/providers/openRouterProvider');
const { buildPrompt } = require('../src/services/grading/promptBuilder');

const request = {
    question: 'Explain one concept.',
    groundTruths: ['A correct explanation.'],
    studentAnswer: 'A correct explanation.',
    rubric: [{ id: 'accuracy', title: 'Accuracy', description: 'Correct explanation', maxScore: 2 }],
    keyConcepts: ['correct explanation'],
    maxScore: 2,
    language: 'en',
};

const candidate = {
    totalScore: 2,
    maxScore: 2,
    criteria: [{
        rubricId: 'accuracy',
        score: 2,
        maxScore: 2,
        evidence: ['correct explanation'],
        reason: 'The required explanation is present.',
    }],
    detectedConcepts: ['correct explanation'],
    missingConcepts: [],
    confidence: 0.95,
    needsHumanReview: false,
    reviewReason: '',
};

const response = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
});

test('GeminiProvider maps structured JSON and token usage into the common envelope', async () => {
    let sent;
    const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'test-gemini-model',
        fetchImpl: async (url, options) => {
            sent = { url, options, body: JSON.parse(options.body) };
            return response({
                candidates: [{ content: { parts: [{ text: JSON.stringify(candidate) }] } }],
                modelVersion: 'test-gemini-model-v1',
                usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
            });
        },
    });

    const result = await provider.grade(request, { prompt: buildPrompt(request), signal: new AbortController().signal });

    assert.deepEqual(result.candidate, candidate);
    assert.equal(result.model, 'test-gemini-model-v1');
    assert.equal(result.inputTokens, 20);
    assert.equal(result.outputTokens, 10);
    assert.equal(sent.options.headers['x-goog-api-key'], 'test-key');
    assert.equal(sent.body.generationConfig.temperature, 0);
    assert.equal(sent.body.generationConfig.responseMimeType, 'application/json');
});

test('OpenRouterProvider maps chat completion JSON, model, tokens, and cost into the common envelope', async () => {
    let sent;
    const provider = new OpenRouterProvider({
        apiKey: 'test-key',
        model: 'vendor/test-model',
        referer: 'https://example.test',
        appName: 'Exam Test',
        fetchImpl: async (url, options) => {
            sent = { url, options, body: JSON.parse(options.body) };
            return response({
                model: 'vendor/test-model',
                choices: [{ message: { content: JSON.stringify(candidate) }, finish_reason: 'stop' }],
                usage: { prompt_tokens: 21, completion_tokens: 11, cost: 0.0004 },
            });
        },
    });

    const result = await provider.grade(request, { prompt: buildPrompt(request), signal: new AbortController().signal });

    assert.deepEqual(result.candidate, candidate);
    assert.equal(result.inputTokens, 21);
    assert.equal(result.outputTokens, 11);
    assert.equal(result.estimatedCost, 0.0004);
    assert.equal(sent.options.headers.Authorization, 'Bearer test-key');
    assert.equal(sent.body.temperature, 0);
    assert.equal(sent.body.response_format.type, 'json_object');
});

test('provider adapters reject invalid JSON without repairing or inventing a score', async () => {
    const provider = new OpenRouterProvider({
        apiKey: 'test-key',
        model: 'vendor/test-model',
        fetchImpl: async () => response({
            choices: [{ message: { content: 'not-json' }, finish_reason: 'stop' }],
        }),
    });

    await assert.rejects(
        provider.grade(request, { prompt: buildPrompt(request), signal: new AbortController().signal }),
        error => error.code === 'INVALID_JSON' && error.retriable === true
    );
});
