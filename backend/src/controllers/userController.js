const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { title, firstName, lastName, phoneNumber, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        title,
        firstName,
        lastName,
        phoneNumber,
        email,
        password,
        role: 'student' // Force role to student
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            title: user.title,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            title: user.title,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Get all students
// @route   GET /api/users/students
// @access  Private/Teacher
const getStudents = asyncHandler(async (req, res) => {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json(students);
});

// @desc    Add a student (Teacher)
// @route   POST /api/users/students
// @access  Private/Teacher
const addStudent = asyncHandler(async (req, res) => {
    const { title, firstName, lastName, phoneNumber, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('มีอีเมลนี้ในระบบแล้ว');
    }

    const user = await User.create({
        title,
        firstName,
        lastName,
        phoneNumber,
        email,
        password,
        role: 'student' 
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            title: user.title,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            email: user.email,
        });
    } else {
        res.status(400);
        throw new Error('ข้อมูลนักเรียนไม่ถูกต้อง');
    }
});

// @desc    Update a student
// @route   PUT /api/users/students/:id
// @access  Private/Teacher
const updateStudent = asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.id);

    if (student) {
        student.title = req.body.title || student.title;
        student.firstName = req.body.firstName || student.firstName;
        student.lastName = req.body.lastName || student.lastName;
        student.phoneNumber = req.body.phoneNumber || student.phoneNumber;
        student.email = req.body.email || student.email;

        // Optionally update password if provided
        if (req.body.password) {
            student.password = req.body.password;
        }

        const updatedStudent = await student.save();

        res.json({
            _id: updatedStudent._id,
            title: updatedStudent.title,
            firstName: updatedStudent.firstName,
            lastName: updatedStudent.lastName,
            phoneNumber: updatedStudent.phoneNumber,
            email: updatedStudent.email,
        });
    } else {
        res.status(404);
        throw new Error('ไม่พบข้อมูลนักเรียน');
    }
});

// @desc    Delete a student
// @route   DELETE /api/users/students/:id
// @access  Private/Teacher
const deleteStudent = asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.id);

    if (student) {
        await User.deleteOne({ _id: student._id });
        res.json({ message: 'ลบข้อมูลนักเรียนเรียบร้อยแล้ว' });
    } else {
        res.status(404);
        throw new Error('ไม่พบข้อมูลนักเรียน');
    }
});

module.exports = {
    registerUser,
    authUser,
    getStudents,
    addStudent,
    updateStudent,
    deleteStudent,
};
