const { z } = require('zod');

/**
 * @typedef {Object} RubricCriterion
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {number} maxScore
 */

/**
 * @typedef {Object} GradeRequest
 * @property {string} question
 * @property {string[]} groundTruths
 * @property {string} studentAnswer
 * @property {RubricCriterion[]} rubric
 * @property {string[]} keyConcepts
 * @property {number} maxScore
 * @property {'th'|'en'} language
 */

/**
 * GradeResult is represented by gradeCandidateSchema plus trusted metadata added by AIRouter.
 * Provider adapters return an untrusted candidate envelope; only AIRouter emits this contract.
 * @typedef {Object} GradeResult
 */

const rubricCriterionSchema = z.object({
    id: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(3000),
    maxScore: z.number().finite().positive().max(1000),
}).strict();

const gradeRequestSchema = z.object({
    question: z.string().trim().min(1).max(20000),
    groundTruths: z.array(z.string().trim().min(1).max(12000)).min(1).max(10),
    studentAnswer: z.string().max(50000),
    rubric: z.array(rubricCriterionSchema).min(1).max(30),
    keyConcepts: z.array(z.string().trim().min(1).max(300)).max(100),
    maxScore: z.number().finite().positive().max(1000),
    language: z.enum(['th', 'en']),
}).strict().superRefine((value, ctx) => {
    const ids = value.rubric.map(item => item.id);
    if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: 'custom', path: ['rubric'], message: 'Rubric IDs must be unique' });
    }

    const rubricTotal = value.rubric.reduce((sum, item) => sum + item.maxScore, 0);
    if (Math.abs(rubricTotal - value.maxScore) > 1e-6) {
        ctx.addIssue({ code: 'custom', path: ['maxScore'], message: 'Rubric maximum scores must sum to maxScore' });
    }
});

const criterionResultSchema = z.object({
    rubricId: z.string().trim().min(1).max(100),
    score: z.number().finite().min(0),
    maxScore: z.number().finite().positive(),
    evidence: z.array(z.string().trim().min(1).max(2000)).max(20),
    reason: z.string().trim().min(1).max(4000),
}).strict();

const gradeCandidateSchema = z.object({
    totalScore: z.number().finite().min(0),
    maxScore: z.number().finite().positive(),
    criteria: z.array(criterionResultSchema).min(1).max(30),
    detectedConcepts: z.array(z.string().trim().min(1).max(300)).max(100),
    missingConcepts: z.array(z.string().trim().min(1).max(300)).max(100),
    confidence: z.number().finite().min(0).max(1),
    needsHumanReview: z.boolean(),
    reviewReason: z.string().trim().max(2000).optional().default(''),
}).strict();

const buildGradeJsonSchema = (request) => ({
    type: 'object',
    additionalProperties: false,
    properties: {
        totalScore: { type: 'number', minimum: 0, maximum: request.maxScore },
        maxScore: { type: 'number', minimum: request.maxScore, maximum: request.maxScore },
        criteria: {
            type: 'array',
            minItems: request.rubric.length,
            maxItems: request.rubric.length,
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    rubricId: { type: 'string', enum: request.rubric.map(item => item.id) },
                    score: { type: 'number', minimum: 0 },
                    maxScore: { type: 'number', minimum: 0 },
                    evidence: { type: 'array', items: { type: 'string' }, maxItems: 20 },
                    reason: { type: 'string' },
                },
                required: ['rubricId', 'score', 'maxScore', 'evidence', 'reason'],
            },
        },
        detectedConcepts: { type: 'array', items: { type: 'string' } },
        missingConcepts: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        needsHumanReview: { type: 'boolean' },
        reviewReason: { type: 'string' },
    },
    required: [
        'totalScore',
        'maxScore',
        'criteria',
        'detectedConcepts',
        'missingConcepts',
        'confidence',
        'needsHumanReview',
        'reviewReason',
    ],
});

module.exports = {
    rubricCriterionSchema,
    gradeRequestSchema,
    gradeCandidateSchema,
    buildGradeJsonSchema,
};
