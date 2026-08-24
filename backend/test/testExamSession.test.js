const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreExactAnswer, isAiQuestion } = require('../src/services/grading/attemptScoreService');

test('isAiQuestion identifies essay AI questions vs objective choices', () => {
    assert.equal(isAiQuestion({ type: 'text', gradingMode: 'ai' }), true);
    assert.equal(isAiQuestion({ type: 'radio', gradingMode: 'exact' }), false);
    assert.equal(isAiQuestion({ type: 'checkbox', gradingMode: 'exact' }), false);
});

test('scoreExactAnswer calculates correct score for objective test questions', () => {
    const radioQ = {
        questionId: 'q1',
        type: 'radio',
        correctAnswer: 'b',
        points: 5,
    };
    assert.equal(scoreExactAnswer(radioQ, { questionId: 'q1', selectedAnswer: 'b' }), 5);
    assert.equal(scoreExactAnswer(radioQ, { questionId: 'q1', selectedAnswer: 'a' }), 0);

    const checkboxQ = {
        questionId: 'q2',
        type: 'checkbox',
        correctAnswer: 'a,c',
        points: 10,
    };
    assert.equal(scoreExactAnswer(checkboxQ, { questionId: 'q2', selectedAnswer: 'c,a' }), 10);
    assert.equal(scoreExactAnswer(checkboxQ, { questionId: 'q2', selectedAnswer: 'a' }), 0);
});
