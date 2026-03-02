const express = require('express');
const router = express.Router();
const { registerUser, authUser, getStudents } = require('../controllers/userController');
const { protect, teacher } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/students', protect, teacher, getStudents);

module.exports = router;
