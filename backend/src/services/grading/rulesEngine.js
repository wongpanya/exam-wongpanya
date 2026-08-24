const aiConfig = require('../../config/aiConfig');

const buildEmptyAnswerResult = (request) => ({
    totalScore: 0,
    maxScore: request.maxScore,
    criteria: request.rubric.map(item => ({
        rubricId: item.id,
        score: 0,
        maxScore: item.maxScore,
        evidence: [],
        reason: request.language === 'th' ? 'ไม่พบคำตอบของผู้เรียน' : 'The student answer is empty.',
    })),
    detectedConcepts: [],
    missingConcepts: [...request.keyConcepts],
    confidence: 1,
    needsHumanReview: false,
    reviewReason: '',
});

const evaluatePreGradeRules = (request) => {
    if (String(request.studentAnswer || '').trim()) return null;
    return {
        result: buildEmptyAnswerResult(request),
        decisions: [{
            rule: 'empty-answer',
            action: 'deterministic-zero',
            reason: 'Empty answers receive zero without calling an AI provider.',
        }],
    };
};

const applyPostGradeRules = (result, request, { previousResult = null, config = aiConfig } = {}) => {
    const decisions = [];
    const reviewReasons = result.reviewReason ? [result.reviewReason] : [];

    if (result.confidence < config.reviewConfidenceThreshold) {
        const reason = `Confidence ${result.confidence.toFixed(2)} is below ${config.reviewConfidenceThreshold.toFixed(2)}.`;
        decisions.push({ rule: 'low-confidence', action: 'require-human-review', reason });
        reviewReasons.push(reason);
    }

    for (const criterion of result.criteria) {
        const ratio = criterion.maxScore > 0 ? criterion.score / criterion.maxScore : 0;
        if (ratio >= config.highScoreWithoutEvidenceRatio && criterion.evidence.length === 0) {
            const reason = `Rubric ${criterion.rubricId} received a high score without evidence.`;
            decisions.push({ rule: 'high-score-without-evidence', action: 'require-human-review', reason });
            reviewReasons.push(reason);
        }
    }

    if (previousResult && Math.abs(previousResult.totalScore - result.totalScore) >= config.scoreDisagreementThreshold) {
        const reason = `The new AI score differs from the previous AI score by ${Math.abs(previousResult.totalScore - result.totalScore)} points.`;
        decisions.push({ rule: 'score-disagreement', action: 'require-human-review', reason });
        reviewReasons.push(reason);
    }

    const needsHumanReview = result.needsHumanReview || decisions.some(item => item.action === 'require-human-review');
    return {
        result: {
            ...result,
            needsHumanReview,
            reviewReason: needsHumanReview ? Array.from(new Set(reviewReasons)).join(' ') : '',
        },
        decisions,
    };
};

module.exports = { buildEmptyAnswerResult, evaluatePreGradeRules, applyPostGradeRules };
