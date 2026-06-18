const express = require('express');
const router = express.Router();
const { createExam, getExams, getExamById, updateExam, deleteExam } = require('../controllers/examController');
const { protect, teacher } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createExamSchema, updateExamSchema } = require('../schemas/examSchemas');

router.route('/')
    .post(protect, teacher, validate(createExamSchema), createExam)
    .get(protect, teacher, getExams);

router.route('/:id')
    .get(protect, teacher, getExamById)
    .put(protect, teacher, validate(updateExamSchema), updateExam)
    .delete(protect, teacher, deleteExam);

module.exports = router;
