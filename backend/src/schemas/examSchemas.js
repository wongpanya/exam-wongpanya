const { z } = require('zod');

const choiceSchema = z.object({
    value: z.string(),
    label: z.string(),
});

const questionSchema = z.object({
    questionId: z.string().optional(),
    type: z.enum(['radio', 'checkbox', 'text']).default('radio'),
    prompt: z.string().min(1),
    choices: z.array(choiceSchema).default([]),
    correctAnswer: z.string(),
    points: z.number().min(0).default(1),
});

const createExamSchema = z.object({
    title: z.string().min(1, 'กรุณากรอกชื่อข้อสอบ'),
    durationMin: z.number().min(1, 'ระยะเวลาต้องมากกว่า 0'),
    questions: z.array(questionSchema).min(1, 'ต้องมีอย่างน้อย 1 ข้อ'),
    category: z.string().optional().default('ทั่วไป'),
});

const updateExamSchema = z.object({
    title: z.string().min(1).optional(),
    durationMin: z.number().min(1).optional(),
    questions: z.array(questionSchema).min(1).optional(),
    category: z.string().optional(),
});

module.exports = { createExamSchema, updateExamSchema };
