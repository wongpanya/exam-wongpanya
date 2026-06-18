const express = require('express');
const router = express.Router();
const { registerUser, authUser, getStudents, getStudentHistory } = require('../controllers/userController');
const { protect, teacher } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../schemas/userSchemas');

router.post('/register', authLimiter, validate(registerSchema), registerUser);
router.post('/login', authLimiter, validate(loginSchema), authUser);
router.get('/students', protect, teacher, getStudents);
router.get('/me/history', protect, getStudentHistory);

module.exports = router;
