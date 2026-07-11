const { z } = require('zod');

const emailSchema = z.string()
    .trim()
    .toLowerCase()
    .email('อีเมลไม่ถูกต้อง');

const upEmailSchema = emailSchema
    .refine(email => email.endsWith('@up.ac.th'), 'ต้องใช้อีเมล @up.ac.th เท่านั้น');

const registerSchema = z.object({
    title: z.string().min(1, 'กรุณากรอกคำนำหน้า'),
    firstName: z.string().min(1, 'กรุณากรอกชื่อ').max(100),
    lastName: z.string().min(1, 'กรุณากรอกนามสกุล').max(100),
    phoneNumber: z.string().min(9, 'เบอร์โทรไม่ถูกต้อง').max(15),
    email: upEmailSchema,
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
    studentCode: z.string()
        .trim()
        .min(1, 'กรุณากรอกรหัสนิสิต')
        .regex(/^[^@\s]+$/, 'กรุณากรอกเฉพาะรหัสนิสิต')
        .optional(),
});

const updateUserSchema = z.object({
    title: z.string().min(1, 'กรุณากรอกคำนำหน้า').optional(),
    firstName: z.string().min(1, 'กรุณากรอกชื่อ').max(100).optional(),
    lastName: z.string().min(1, 'กรุณากรอกนามสกุล').max(100).optional(),
    phoneNumber: z.string().min(9, 'เบอร์โทรไม่ถูกต้อง').max(15).optional(),
    email: upEmailSchema.optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'ต้องระบุข้อมูลที่จะแก้ไขอย่างน้อย 1 รายการ',
});

const resetPasswordSchema = z.object({
    newPassword: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

module.exports = { registerSchema, loginSchema, updateUserSchema, resetPasswordSchema };
