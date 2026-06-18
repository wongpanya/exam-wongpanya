const { z } = require('zod');

const startSessionSchema = z.object({
    qrRotateInterval: z.number().min(5).max(60).default(10),
    shuffleQuestions: z.boolean().default(false),
    maxCheatEvents: z.number().min(0).max(100).default(1),
    cheatConfig: z.object({
        tabSwitch: z.boolean().default(false),
        windowBlur: z.boolean().default(false),
        copyPaste: z.boolean().default(false),
        rightClick: z.boolean().default(false),
        printScreen: z.boolean().default(false),
        devTools: z.boolean().default(false),
        forbiddenKeys: z.boolean().default(false),
    }).default({}),
});

const joinSessionSchema = z.object({
    qrToken: z.string().optional(),
    joinToken: z.string().optional(),
}).refine(data => data.qrToken || data.joinToken, { message: 'QR Token required' });

const autoSaveSchema = z.object({
    answers: z.array(z.object({
        questionId: z.string(),
        selectedAnswer: z.string().default(''),
    })),
});

const submitSchema = z.object({
    answers: z.array(z.object({
        questionId: z.string(),
        selectedAnswer: z.string().default(''),
    })),
});

const cheatLogSchema = z.object({
    eventType: z.enum(['tab_switch', 'blur', 'focus', 'copy', 'cut', 'paste', 'right_click', 'print_screen', 'devtools', 'forbidden_key']),
    detail: z.string().default(''),
});

const cheatLogBatchSchema = z.object({
    events: z.array(z.object({
        eventType: z.enum(['tab_switch', 'blur', 'focus', 'copy', 'cut', 'paste', 'right_click', 'print_screen', 'devtools', 'forbidden_key']),
        detail: z.string().default(''),
    })).min(1).max(50),
});

module.exports = { startSessionSchema, joinSessionSchema, autoSaveSchema, submitSchema, cheatLogSchema, cheatLogBatchSchema };
