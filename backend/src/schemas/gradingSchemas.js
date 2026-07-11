const { z } = require('zod');
const { gradeRequestSchema } = require('../services/grading/contracts');

const storedGradeSchema = z.object({
    attemptId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid attemptId'),
    questionId: z.string().trim().min(1).max(100),
}).strict();

const testGradeSchema = z.object({
    request: gradeRequestSchema,
    preferredProvider: z.enum(['system', 'gemini', 'openrouter']).default('system'),
    preferredModel: z.string().trim().max(300).default(''),
}).strict();

const gradeSchema = z.union([storedGradeSchema, testGradeSchema]);

const regradeSchema = z.object({
    preferredProvider: z.enum(['system', 'gemini', 'openrouter']).optional(),
    preferredModel: z.string().trim().max(300).optional(),
}).strict();

const providerKeySchema = z.object({
    apiKey: z.string().trim().min(8).max(2000),
}).strict();

const providerModelSchema = z.object({
    model: z.string().trim().min(1).max(300),
}).strict();

const primaryProviderSchema = z.object({
    provider: z.enum(['gemini', 'openrouter']),
}).strict();

const reviewSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('confirm'),
        reason: z.string().trim().max(2000).default(''),
    }).strict(),
    z.object({
        action: z.literal('adjust'),
        score: z.number().finite().min(0).max(1000),
        reason: z.string().trim().min(1).max(2000),
    }).strict(),
]);

module.exports = {
    gradeSchema,
    regradeSchema,
    reviewSchema,
    providerKeySchema,
    providerModelSchema,
    primaryProviderSchema,
};
