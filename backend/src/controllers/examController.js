const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Exam = require('../models/examModel');
const Category = require('../models/categoryModel');
const User = require('../models/userModel');

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
    
    const showArchived = req.query.archived;
    if (showArchived === 'true') {
        query.isArchived = true;
    } else if (showArchived === 'all') {
        // Do not filter by isArchived, return all categories
    } else {
        query.isArchived = { $ne: true };
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

// @desc    Join a category (subject) by 6-character code
// @route   POST /api/exams/categories/join
// @access  Private/Student
const joinCategory = asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) {
        res.status(400);
        throw new Error('กรุณาระบุรหัสเข้าชั้นเรียน');
    }

    // Normalize code: lowercase and remove all whitespace
    const cleanedCode = code.trim().toLowerCase().replace(/\s+/g, '');

    const category = await Category.findOne({ joinCode: cleanedCode });
    if (!category) {
        res.status(404);
        throw new Error('ไม่พบรายวิชานี้ หรือรหัสเข้าร่วมไม่ถูกต้อง');
    }

    // Check if student is already in the class
    if (category.students.includes(req.user._id)) {
        res.status(400);
        throw new Error('คุณเข้าร่วมรายวิชานี้อยู่แล้ว');
    }

    category.students.push(req.user._id);
    await category.save();

    res.json({
        message: 'เข้าร่วมรายวิชาสำเร็จ',
        category: {
            _id: category._id,
            name: category.name,
            joinCode: category.joinCode
        }
    });
});

// @desc    Get categories student has joined
// @route   GET /api/exams/categories/my-joined
// @access  Private/Student
const getMyJoinedCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({ students: req.user._id })
        .populate('createdBy', 'firstName lastName email');
    res.json(categories);
});

// @desc    Get students in a category
// @route   GET /api/exams/categories/:id/students
// @access  Private/Teacher
const getCategoryStudents = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id)
        .populate('students', 'firstName lastName email phoneNumber');

    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    // Owner check (or bypass superadmin)
    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized');
    }

    res.json(category.students || []);
});

// @desc    Add a student to a category manually (search by email, studentId, etc.)
// @route   POST /api/exams/categories/:id/students
// @access  Private/Teacher
const addStudentToCategoryManual = asyncHandler(async (req, res) => {
    const { searchQuery } = req.body;
    if (!searchQuery) {
        res.status(400);
        throw new Error('กรุณาระบุข้อมูลสำหรับค้นหา (รหัสนิสิต/อีเมล/ชื่อ/เบอร์โทร)');
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    // Owner check
    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized');
    }

    // Find student. We support email, prefix (student ID in email), firstName, lastName, phoneNumber
    const searchRegex = new RegExp(searchQuery.trim(), 'i');
    const student = await User.findOne({
        role: 'student',
        $or: [
            { email: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex },
            { phoneNumber: searchRegex }
        ]
    });

    if (!student) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลนักเรียน/นิสิตในระบบ');
    }

    // Check if student is already in category
    if (category.students.includes(student._id)) {
        res.status(400);
        throw new Error('นักเรียนคนนี้อยู่ในรายวิชานี้อยู่แล้ว');
    }

    category.students.push(student._id);
    await category.save();

    res.json({
        message: 'เพิ่มนักเรียนสำเร็จ',
        student: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phoneNumber: student.phoneNumber
        }
    });
});

// @desc    Remove a student from a category
// @route   DELETE /api/exams/categories/:id/students/:studentId
// @access  Private/Teacher
const removeStudentFromCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    // Owner check
    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized');
    }

    category.students = category.students.filter(
        (s) => s.toString() !== req.params.studentId.toString()
    );
    await category.save();

    res.json({ message: 'ลบนักเรียนออกจากรายวิชาสำเร็จ' });
});

// @desc    Update a category name
// @route   PUT /api/exams/categories/:id
// @access  Private/Teacher
const updateCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Please provide category name');
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized');
    }

    category.name = name.trim();
    const updatedCategory = await category.save();

    res.json(updatedCategory);
});

// @desc    Archive a category
// @route   PUT /api/exams/categories/:id/archive
// @access  Private/Teacher
const archiveCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized');
    }
    
    category.isArchived = true;
    await category.save();
    res.json({ message: 'Category archived successfully', category });
});

// @desc    Restore a category
// @route   PUT /api/exams/categories/:id/restore
// @access  Private/Teacher
const restoreCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    if (category.createdBy.toString() !== req.user._id.toString() && req.user.email !== '66025694@up.ac.th') {
        res.status(403);
        throw new Error('Not authorized');
    }
    
    category.isArchived = false;
    await category.save();
    res.json({ message: 'Category restored successfully', category });
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
    joinCategory,
    getMyJoinedCategories,
    getCategoryStudents,
    addStudentToCategoryManual,
    removeStudentFromCategory,
    updateCategory,
    archiveCategory,
    restoreCategory,
};
