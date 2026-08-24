const test = require('node:test');
const assert = require('node:assert/strict');
const { computeBenchmarkSummary, benchmarkAdHoc } = require('../src/services/grading/gradingService');

test('computeBenchmarkSummary calculates score metrics and selects best value and highest quality models', () => {
    const results = [
        {
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            label: 'Gemini 2.5 Flash',
            status: 'succeeded',
            latencyMs: 850,
            result: {
                totalScore: 8,
                rubricScores: [
                    { rubricId: 'c1', score: 4, feedback: 'ดี', evidence: 'หลักฐาน 1' },
                    { rubricId: 'c2', score: 4, feedback: 'ดี', evidence: '' },
                ],
                metadata: { latencyMs: 850, costUsd: 0.0001 },
            },
        },
        {
            provider: 'openrouter',
            model: 'anthropic/claude-3.5-sonnet',
            label: 'Claude 3.5 Sonnet',
            status: 'succeeded',
            latencyMs: 2400,
            result: {
                totalScore: 10,
                rubricScores: [
                    { rubricId: 'c1', score: 5, feedback: 'ละเอียดมาก', evidence: 'หลักฐาน 1 จากนักเรียน' },
                    { rubricId: 'c2', score: 5, feedback: 'ละเอียดมาก', evidence: 'หลักฐาน 2 จากนักเรียน' },
                ],
                metadata: { latencyMs: 2400, costUsd: 0.003 },
            },
        },
    ];

    const summary = computeBenchmarkSummary(results);
    assert.equal(summary.totalEvaluated, 2);
    assert.equal(summary.successfulCount, 2);
    assert.equal(summary.failedCount, 0);
    assert.equal(summary.averageScore, 9);
    assert.equal(summary.scoreRange.min, 8);
    assert.equal(summary.scoreRange.max, 10);
    assert.equal(summary.scoreRange.spread, 2);
    assert.equal(summary.recommendations.bestValue.model, 'gemini-2.5-flash');
    assert.equal(summary.recommendations.highestQuality.model, 'anthropic/claude-3.5-sonnet');
});

test('computeBenchmarkSummary handles all failed models gracefully', () => {
    const results = [
        { provider: 'gemini', model: 'invalid-model', status: 'failed', error: 'Not found' },
    ];
    const summary = computeBenchmarkSummary(results);
    assert.equal(summary.totalEvaluated, 1);
    assert.equal(summary.successfulCount, 0);
    assert.equal(summary.failedCount, 1);
    assert.equal(summary.recommendations, null);
});

test('benchmarkAdHoc returns deterministic zero score for empty student answers on all models', async () => {
    const rawRequest = {
        question: 'อธิบายแนวคิด AI',
        groundTruths: ['AI คือปัญญาประดิษฐ์'],
        studentAnswer: '   ',
        rubric: [{ id: 'r1', title: 'ความถูกต้อง', description: 'ความถูกต้อง', maxScore: 5 }],
        keyConcepts: ['AI'],
        maxScore: 5,
        language: 'th',
    };

    const models = [
        { provider: 'gemini', model: 'gemini-2.5-flash' },
        { provider: 'openrouter', model: 'openai/gpt-4o' },
    ];

    const benchmarkResult = await benchmarkAdHoc(rawRequest, { models });
    assert.equal(benchmarkResult.results.length, 2);
    assert.equal(benchmarkResult.results[0].result.totalScore, 0);
    assert.equal(benchmarkResult.results[1].result.totalScore, 0);
    assert.equal(benchmarkResult.summary.averageScore, 0);
    assert.equal(benchmarkResult.summary.successfulCount, 2);
});
