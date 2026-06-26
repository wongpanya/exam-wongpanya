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
            role: user.email === '66025694@up.ac.th' ? 'teacher' : user.role,
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
            role: user.email === '66025694@up.ac.th' ? 'teacher' : user.role,
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

// @desc    Update user profile (teacher can edit any student)
// @route   PUT /api/users/:id
// @access  Private/Teacher
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const { title, firstName, lastName, phoneNumber, email } = req.body;

    if (title) user.title = title;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (email) user.email = email;

    const updatedUser = await user.save();

    res.json({
        _id: updatedUser._id,
        title: updatedUser.title,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        email: updatedUser.email,
        role: updatedUser.email === '66025694@up.ac.th' ? 'teacher' : updatedUser.role,
    });
});

// @desc    Reset user password (teacher can reset any student's password)
// @route   PUT /api/users/:id/reset-password
// @access  Private/Teacher
const resetPassword = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        res.status(400);
        throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว' });
});

// @desc    Delete a user (teacher can delete any student)
// @route   DELETE /api/users/:id
// @access  Private/Teacher
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Prevent deleting other teachers/admins/devs
    if (user.role !== 'student') {
        res.status(403);
        throw new Error('สามารถลบได้เฉพาะนักเรียนเท่านั้น');
    }

    await user.deleteOne();

    res.json({ message: 'ลบผู้ใช้เรียบร้อยแล้ว' });
});

module.exports = {
    registerUser,
    authUser,
    getStudents,
    getStudentHistory,
    updateUser,
    resetPassword,
    deleteUser,
};
