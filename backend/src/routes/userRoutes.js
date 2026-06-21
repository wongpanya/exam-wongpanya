const express = require('express');
const router = express.Router();
const { registerUser, authUser, getStudents, getStudentHistory, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const { protect, teacher } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema, updateUserSchema, resetPasswordSchema } = require('../schemas/userSchemas');

router.post('/register', authLimiter, validate(registerSchema), registerUser);
router.post('/login', authLimiter, validate(loginSchema), authUser);
router.get('/students', protect, teacher, getStudents);
router.get('/me/history', protect, getStudentHistory);
router.put('/:id', protect, teacher, validate(updateUserSchema), updateUser);
router.put('/:id/reset-password', protect, teacher, validate(resetPasswordSchema), resetPassword);
router.delete('/:id', protect, teacher, deleteUser);

module.exports = router;
