const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validateGradeRequest,
    validateGradeCandidate,
} = require('../src/services/grading/gradeValidator');
const { GradeValidationError } = require('../src/services/grading/errors');
const {
    evaluatePreGradeRules,
    applyPostGradeRules,
} = require('../src/services/grading/rulesEngine');

const makeRequest = () => ({
    question: 'Explain photosynthesis.',
    groundTruths: [
        'Plants use sunlight to convert carbon dioxide and water into glucose and oxygen.',
    ],
    studentAnswer: 'Plants use sunlight to convert carbon dioxide and water into glucose, releasing oxygen.',
    rubric: [
        {
            id: 'concept',
            title: 'Energy source',
            description: 'Identifies sunlight as the energy source.',
            maxScore: 4,
        },
        {
            id: 'process',
            title: 'Chemical process',
            description: 'Describes the inputs and outputs.',
            maxScore: 6,
        },
    ],
    keyConcepts: ['sunlight', 'carbon dioxide', 'water', 'glucose', 'oxygen'],
    maxScore: 10,
    language: 'en',
});

const makeCandidate = () => ({
    totalScore: 10,
    maxScore: 10,
    criteria: [
        {
            rubricId: 'concept',
            score: 4,
            maxScore: 4,
            evidence: ['sunlight'],
            reason: 'The answer identifies sunlight.',
        },
        {
            rubricId: 'process',
            score: 6,
            maxScore: 6,
            evidence: ['carbon dioxide and water into glucose'],
            reason: 'The answer identifies the inputs and product.',
        },
    ],
    detectedConcepts: ['sunlight', 'carbon dioxide', 'water', 'glucose', 'oxygen'],
    missingConcepts: [],
    confidence: 0.95,
    needsHumanReview: false,
    reviewReason: '',
});

const clone = value => JSON.parse(JSON.stringify(value));

test('grade validator accepts a candidate that exactly follows the canonical rubric', () => {
    const request = makeRequest();
    const candidate = makeCandidate();

    assert.deepEqual(validateGradeRequest(request), request);
    assert.deepEqual(validateGradeCandidate(candidate, request), candidate);
});

test('grade validator rejects a score over its rubric maximum', () => {
    const candidate = makeCandidate();
    candidate.criteria[0].score = 4.1;
    candidate.criteria[1].score = 5.9;

    assert.throws(
        () => validateGradeCandidate(candidate, makeRequest()),
        error => error instanceof GradeValidationError
            && /score out of range for concept/.test(error.message)
    );
});

test('grade validator rejects a total that does not equal the criterion sum', () => {
    const candidate = makeCandidate();
    candidate.totalScore = 9;

    assert.throws(
        () => validateGradeCandidate(candidate, makeRequest()),
        error => error instanceof GradeValidationError
            && /does not equal the rubric score sum/.test(error.message)
    );
});

test('grade validator rejects evidence that is not contained in the student answer', () => {
    const candidate = makeCandidate();
    candidate.criteria[0].evidence = ['chlorophyll absorbs violet light'];

    assert.throws(
        () => validateGradeCandidate(candidate, makeRequest()),
        error => error instanceof GradeValidationError
            && /is not present in the student answer/.test(error.message)
    );
});

test('grade validator rejects a candidate missing a requested rubric criterion', () => {
    const candidate = makeCandidate();
    candidate.criteria = [candidate.criteria[0]];
    candidate.totalScore = 4;

    assert.throws(
        () => validateGradeCandidate(candidate, makeRequest()),
        error => error instanceof GradeValidationError
            && /rubric IDs do not match/.test(error.message)
    );
});

test('grade request validator rejects a request with no rubric', () => {
    const request = makeRequest();
    request.rubric = [];

    assert.throws(
        () => validateGradeRequest(request),
        error => error instanceof GradeValidationError
            && error.message === 'Invalid grade request'
    );
});

test('pre-grade empty-answer rule returns a deterministic zero without AI work', () => {
    const request = { ...makeRequest(), studentAnswer: '  \n\t ' };
    const outcome = evaluatePreGradeRules(request);

    assert.ok(outcome);
    assert.equal(outcome.result.totalScore, 0);
    assert.equal(outcome.result.maxScore, request.maxScore);
    assert.deepEqual(outcome.result.criteria.map(item => item.score), [0, 0]);
    assert.deepEqual(outcome.result.missingConcepts, request.keyConcepts);
    assert.deepEqual(outcome.decisions.map(item => item.rule), ['empty-answer']);
    assert.equal(evaluatePreGradeRules(makeRequest()), null);
});

test('post-grade rules require review for low confidence', () => {
    const result = { ...makeCandidate(), confidence: 0.4 };
    const outcome = applyPostGradeRules(result, makeRequest(), {
        config: {
            reviewConfidenceThreshold: 0.7,
            highScoreWithoutEvidenceRatio: 0.7,
            scoreDisagreementThreshold: 2,
        },
    });

    assert.equal(outcome.result.needsHumanReview, true);
    assert.deepEqual(outcome.decisions.map(item => item.rule), ['low-confidence']);
    assert.match(outcome.result.reviewReason, /Confidence 0\.40 is below 0\.70/);
});

test('post-grade rules require review for a high score with no evidence', () => {
    const result = clone(makeCandidate());
    result.criteria[0].evidence = [];
    const outcome = applyPostGradeRules(result, makeRequest(), {
        config: {
            reviewConfidenceThreshold: 0.7,
            highScoreWithoutEvidenceRatio: 0.7,
            scoreDisagreementThreshold: 2,
        },
    });

    assert.equal(outcome.result.needsHumanReview, true);
    assert.deepEqual(outcome.decisions.map(item => item.rule), ['high-score-without-evidence']);
    assert.match(outcome.result.reviewReason, /concept received a high score without evidence/);
});

test('post-grade rules require review when a new score disagrees with the prior score', () => {
    const outcome = applyPostGradeRules(makeCandidate(), makeRequest(), {
        previousResult: { totalScore: 7 },
        config: {
            reviewConfidenceThreshold: 0.7,
            highScoreWithoutEvidenceRatio: 0.7,
            scoreDisagreementThreshold: 2,
        },
    });

    assert.equal(outcome.result.needsHumanReview, true);
    assert.deepEqual(outcome.decisions.map(item => item.rule), ['score-disagreement']);
    assert.match(outcome.result.reviewReason, /differs from the previous AI score by 3 points/);
});
