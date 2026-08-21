const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreExactAnswer, isAiQuestion } = require('../src/services/grading/attemptScoreService');

test('scoreExactAnswer grades single-choice correctly', () => {
    const question = { questionId: 'q1', type: 'radio', correctAnswer: 'b', points: 2 };
    assert.equal(scoreExactAnswer(question, { questionId: 'q1', selectedAnswer: 'b' }), 2);
    assert.equal(scoreExactAnswer(question, { questionId: 'q1', selectedAnswer: 'a' }), 0);
    assert.equal(scoreExactAnswer(question, null), 0);
});

test('scoreExactAnswer grades multi-choice checkbox correctly regardless of selection order', () => {
    const question = { questionId: 'q2', type: 'checkbox', correctAnswer: 'a,c', points: 3 };
    assert.equal(scoreExactAnswer(question, { questionId: 'q2', selectedAnswer: 'a,c' }), 3);
    assert.equal(scoreExactAnswer(question, { questionId: 'q2', selectedAnswer: 'c,a' }), 3);
    assert.equal(scoreExactAnswer(question, { questionId: 'q2', selectedAnswer: 'a, c' }), 3);
    assert.equal(scoreExactAnswer(question, { questionId: 'q2', selectedAnswer: 'a' }), 0);
    assert.equal(scoreExactAnswer(question, { questionId: 'q2', selectedAnswer: 'a,b,c' }), 0);
});

test('isAiQuestion identifies only text AI questions', () => {
    assert.equal(isAiQuestion({ type: 'text', gradingMode: 'ai' }), true);
    assert.equal(isAiQuestion({ type: 'text', gradingMode: 'manual' }), false);
    assert.equal(isAiQuestion({ type: 'radio' }), false);
    assert.equal(isAiQuestion({ type: 'checkbox' }), false);
});
