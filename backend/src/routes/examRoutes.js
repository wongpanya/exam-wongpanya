const express = require('express');
const router = express.Router();
const { 
    createExam, 
    getExams, 
    getExamById, 
    updateExam, 
    deleteExam, 
    getDistinctCategories, 
    createCategory, 
    deleteCategory,
    joinCategory,
    getMyJoinedCategories,
    getCategoryStudents,
    addStudentToCategoryManual,
    removeStudentFromCategory,
    updateCategory,
    archiveCategory,
    restoreCategory
} = require('../controllers/examController');
const { protect, teacher } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { mutationLimiter } = require('../middleware/rateLimiter');
const { createExamSchema, updateExamSchema } = require('../schemas/examSchemas');

router.route('/')
    .post(protect, teacher, mutationLimiter, validate(createExamSchema), createExam)
    .get(protect, teacher, getExams);

// Student endpoints (accessible by students)
router.route('/categories/join')
    .post(protect, joinCategory);

router.route('/categories/my-joined')
    .get(protect, getMyJoinedCategories);

// Category endpoints
router.route('/categories')
    .get(protect, teacher, getDistinctCategories)
    .post(protect, teacher, mutationLimiter, createCategory);

router.route('/categories/:id')
    .put(protect, teacher, mutationLimiter, updateCategory)
    .delete(protect, teacher, mutationLimiter, deleteCategory);

router.route('/categories/:id/archive')
    .put(protect, teacher, mutationLimiter, archiveCategory);

router.route('/categories/:id/restore')
    .put(protect, teacher, mutationLimiter, restoreCategory);

// Category student management endpoints
router.route('/categories/:id/students')
    .get(protect, teacher, getCategoryStudents)
    .post(protect, teacher, mutationLimiter, addStudentToCategoryManual);

router.route('/categories/:id/students/:studentId')
    .delete(protect, teacher, mutationLimiter, removeStudentFromCategory);

router.route('/:id')
    .get(protect, teacher, getExamById)
    .put(protect, teacher, mutationLimiter, validate(updateExamSchema), updateExam)
    .delete(protect, teacher, mutationLimiter, deleteExam);

module.exports = router;
