const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    authUser, 
    getStudents, 
    addStudent, 
    updateStudent, 
    deleteStudent 
} = require('../controllers/userController');
const { protect, teacher } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);

// Teacher Student Management
router.get('/students', protect, teacher, getStudents);
router.post('/students', protect, teacher, addStudent);
router.put('/students/:id', protect, teacher, updateStudent);
router.delete('/students/:id', protect, teacher, deleteStudent);

module.exports = router;
