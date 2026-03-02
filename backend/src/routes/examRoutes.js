const express = require('express');
const router = express.Router();
const { createExam, getExams, getExamById, updateExam, deleteExam } = require('../controllers/examController');
const { protect, teacher } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, teacher, createExam)
    .get(protect, teacher, getExams);

router.route('/:id')
    .get(protect, teacher, getExamById)
    .put(protect, teacher, updateExam)
    .delete(protect, teacher, deleteExam);

module.exports = router;
