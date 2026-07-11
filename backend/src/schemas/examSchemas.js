const { z } = require('zod');

const choiceSchema = z.object({
    value: z.string().trim().min(1).max(20),
    label: z.string().trim().min(1).max(2000),
}).strict();

const rubricCriterionSchema = z.object({
    rubricId: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(3000),
    maxScore: z.number().finite().positive().max(1000),
}).strict();

const aiGradingSchema = z.object({
    groundTruths: z.array(z.string().trim().min(1).max(12000)).min(1).max(10),
    rubricCriteria: z.array(rubricCriterionSchema).min(1).max(30),
    keyConcepts: z.array(z.string().trim().min(1).max(300)).max(100).default([]),
    language: z.enum(['th', 'en']).default('th'),
    providerPreference: z.enum(['system', 'gemini', 'openrouter']).default('system'),
    modelPreference: z.string().trim().max(300).default(''),
}).strict();

const emptyAiGradingSchema = z.object({
    groundTruths: z.array(z.string().trim().max(12000)).max(10).default([]),
    rubricCriteria: z.array(rubricCriterionSchema).max(30).default([]),
    keyConcepts: z.array(z.string().trim().max(300)).max(100).default([]),
    language: z.enum(['th', 'en']).default('th'),
    providerPreference: z.enum(['system', 'gemini', 'openrouter']).default('system'),
    modelPreference: z.string().trim().max(300).default(''),
}).strict();

const questionSchema = z.object({
    questionId: z.string().trim().min(1).max(100).optional(),
    type: z.enum(['radio', 'checkbox', 'text']).default('radio'),
    prompt: z.string().min(1).max(20000),
    choices: z.array(choiceSchema).max(26).default([]),
    correctAnswer: z.string().max(12000).default(''),
    points: z.number().finite().positive().max(1000).default(1),
    gradingMode: z.enum(['exact', 'ai']).default('exact'),
    aiGrading: z.union([aiGradingSchema, emptyAiGradingSchema]).optional().default({}),
}).strict().superRefine((question, ctx) => {
    const isAiEssay = question.type === 'text' && question.gradingMode === 'ai';

    if (question.gradingMode === 'ai' && question.type !== 'text') {
        ctx.addIssue({ code: 'custom', path: ['gradingMode'], message: 'AI grading is supported only for text questions' });
    }

    if (isAiEssay) {
        const parsed = aiGradingSchema.safeParse(question.aiGrading);
        if (!parsed.success) {
            for (const issue of parsed.error.issues) {
                ctx.addIssue({ ...issue, path: ['aiGrading', ...issue.path] });
            }
            return;
        }

        const ids = question.aiGrading.rubricCriteria.map(item => item.rubricId);
        if (new Set(ids).size !== ids.length) {
            ctx.addIssue({ code: 'custom', path: ['aiGrading', 'rubricCriteria'], message: 'Rubric IDs must be unique' });
        }
        const rubricTotal = question.aiGrading.rubricCriteria.reduce((sum, item) => sum + item.maxScore, 0);
        if (Math.abs(rubricTotal - question.points) > 1e-6) {
            ctx.addIssue({ code: 'custom', path: ['points'], message: 'Rubric maximum scores must sum to question points' });
        }
    } else {
        if (!question.correctAnswer.trim()) {
            ctx.addIssue({ code: 'custom', path: ['correctAnswer'], message: 'A correct answer is required for exact grading' });
        }
        if (question.type !== 'text' && question.choices.length < 2) {
            ctx.addIssue({ code: 'custom', path: ['choices'], message: 'Objective questions require at least two choices' });
        }
    }
});

const questionsSchema = z.array(questionSchema).min(1, 'ต้องมีอย่างน้อย 1 ข้อ').max(200)
    .superRefine((questions, ctx) => {
        const ids = questions.map(item => item.questionId).filter(Boolean);
        if (new Set(ids).size !== ids.length) {
            ctx.addIssue({ code: 'custom', message: 'Question IDs must be unique' });
        }
    });

const createExamSchema = z.object({
    title: z.string().trim().min(1, 'กรุณากรอกชื่อข้อสอบ').max(500),
    durationMin: z.number().int().min(1, 'ระยะเวลาต้องมากกว่า 0').max(1440),
    questions: questionsSchema,
    category: z.string().max(200).optional().default('ทั่วไป'),
}).strict();

const updateExamSchema = z.object({
    title: z.string().trim().min(1).max(500).optional(),
    durationMin: z.number().int().min(1).max(1440).optional(),
    questions: questionsSchema.optional(),
    category: z.string().max(200).optional(),
}).strict();

module.exports = {
    choiceSchema,
    rubricCriterionSchema,
    aiGradingSchema,
    questionSchema,
    createExamSchema,
    updateExamSchema,
};
