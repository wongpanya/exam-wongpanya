const { z } = require('zod');

const registerSchema = z.object({
    title: z.enum(['นาย', 'นาง', 'นางสาว']),
    firstName: z.string().min(1, 'กรุณากรอกชื่อ').max(100),
    lastName: z.string().min(1, 'กรุณากรอกนามสกุล').max(100),
    phoneNumber: z.string().min(9, 'เบอร์โทรไม่ถูกต้อง').max(15),
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

const loginSchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

module.exports = { registerSchema, loginSchema };
