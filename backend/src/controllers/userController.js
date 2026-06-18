const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const ExamAttempt = require('../models/examAttemptModel');
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

// @desc    Get student's exam history
// @route   GET /api/users/me/history
// @access  Private
const getStudentHistory = asyncHandler(async (req, res) => {
    const attempts = await ExamAttempt.find({ student: req.user._id })
        .populate('exam', 'title durationMin')
        .populate('session', 'status startTime endTime')
        .sort({ createdAt: -1 });
        
    res.json(attempts);
});

module.exports = {
    registerUser,
    authUser,
    getStudents,
    getStudentHistory,
};
