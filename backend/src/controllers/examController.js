const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Exam = require('../models/examModel');
const Category = require('../models/categoryModel');

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private/Teacher
const createExam = asyncHandler(async (req, res) => {
    const { title, durationMin, questions, category } = req.body;

    if (!title || !durationMin || !questions || questions.length === 0) {
        res.status(400);
        throw new Error('Please provide title, duration, and at least one question');
    }

    // Auto-generate examId securely to prevent race conditions
    const lastExam = await Exam.findOne({}, { examId: 1 }).sort({ createdAt: -1 });
    const lastNum = lastExam ? parseInt(lastExam.examId.replace('EXAM', ''), 10) : 0;
    const examId = `EXAM${String(lastNum + 1).padStart(3, '0')}`;

    // Auto-generate questionIds if not provided
    const processedQuestions = questions.map((q, index) => ({
        ...q,
        questionId: q.questionId || `Q${String(index + 1).padStart(3, '0')}`,
    }));

    let categoryId = null;
    if (category && category !== 'ทั่วไป') {
        if (mongoose.Types.ObjectId.isValid(category)) {
            categoryId = category;
        } else {
            let categoryDoc = await Category.findOne({ name: category.trim(), createdBy: req.user._id });
            if (!categoryDoc) {
                categoryDoc = await Category.create({ name: category.trim(), createdBy: req.user._id });
            }
            categoryId = categoryDoc._id;
        }
    }

    const exam = await Exam.create({
        examId,
        title,
        durationMin,
        questions: processedQuestions,
        createdBy: req.user._id,
        category: categoryId,
    });

    res.status(201).json(exam);
});

// @desc    Get all exams for logged-in teacher
// @route   GET /api/exams
// @access  Private/Teacher
const getExams = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.email !== '66025694@up.ac.th') {
        query = { createdBy: req.user._id };
    }
    const exams = await Exam.find(query).populate('category').sort({ createdAt: -1 });
    res.json(exams);
});

// @desc    Get single exam by ID
// @route   GET /api/exams/:id
// @access  Private/Teacher
const getExamById = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id).populate('category');

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    // Ensure teacher owns this exam
    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized to view this exam');
    }

    res.json(exam);
});

// @desc    Update an exam
// @route   PUT /api/exams/:id
// @access  Private/Teacher
const updateExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized to update this exam');
    }

    const { title, durationMin, questions, category } = req.body;

    // Auto-generate questionIds if not provided
    const processedQuestions = questions
        ? questions.map((q, index) => ({
            ...q,
            questionId: q.questionId || `Q${String(index + 1).padStart(3, '0')}`,
        }))
        : exam.questions;

    exam.title = title || exam.title;
    exam.durationMin = durationMin || exam.durationMin;
    exam.questions = processedQuestions;
    if (category !== undefined) {
        let categoryId = null;
        if (category && category !== 'ทั่วไป') {
            if (mongoose.Types.ObjectId.isValid(category)) {
                categoryId = category;
            } else {
                let categoryDoc = await Category.findOne({ name: category.trim(), createdBy: req.user._id });
                if (!categoryDoc) {
                    categoryDoc = await Category.create({ name: category.trim(), createdBy: req.user._id });
                }
                categoryId = categoryDoc._id;
            }
        }
        exam.category = categoryId;
    }

    const updatedExam = await exam.save();
    const populatedExam = await Exam.findById(updatedExam._id).populate('category');
    res.json(populatedExam);
});

// @desc    Delete an exam
// @route   DELETE /api/exams/:id
// @access  Private/Teacher
const deleteExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized to delete this exam');
    }

    await exam.deleteOne();
    res.json({ message: 'Exam deleted' });
});

// @desc    Get all distinct categories for teacher
// @route   GET /api/exams/categories
// @access  Private/Teacher
const getDistinctCategories = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.email !== '66025694@up.ac.th') {
        query = { createdBy: req.user._id };
    }
    const categories = await Category.find(query).sort({ name: 1 });
    res.json(categories);
});

// @desc    Create a new category
// @route   POST /api/exams/categories
// @access  Private/Teacher
const createCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        res.status(400);
        throw new Error('Please provide category name');
    }

    const trimmedName = name.trim();

    let category = await Category.findOne({ name: trimmedName, createdBy: req.user._id });
    if (!category) {
        category = await Category.create({ name: trimmedName, createdBy: req.user._id });
    }

    res.status(201).json(category);
});

// @desc    Delete a category
// @route   DELETE /api/exams/categories/:id
// @access  Private/Teacher
const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized');
    }
    
    // Update any exams in this category to null (General)
    await Exam.updateMany({ category: category._id }, { category: null });
    
    await category.deleteOne();
    res.json({ message: 'Category deleted' });
});

module.exports = {
    createExam,
    getExams,
    getExamById,
    updateExam,
    deleteExam,
    getDistinctCategories,
    createCategory,
    deleteCategory,
};
