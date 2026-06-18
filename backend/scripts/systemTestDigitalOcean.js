const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const User = require('../src/models/userModel');
const Exam = require('../src/models/examModel');
const ExamSession = require('../src/models/examSessionModel');
const ExamAttempt = require('../src/models/examAttemptModel');
const CheatingLog = require('../src/models/cheatingLogModel');

const API_URL = 'https://anti-cheat-exam-onytn.ondigitalocean.app/api';
console.log(`🌍 Target API: ${API_URL}`);

// Test configuration
const TEACHER_EMAIL = 'test_teacher_sys@exam.com';
const STUDENT_EMAILS = [
    'test_student_sys0@exam.com',
    'test_student_sys1@exam.com',
    'test_student_sys2@exam.com',
];

const check = {
    pass: (msg) => console.log(`  ✅ [PASS] ${msg}`),
    fail: (msg) => {
        console.error(`  ❌ [FAIL] ${msg}`);
        process.exit(1);
    },
    info: (msg) => console.log(`  ℹ️ [INFO] ${msg}`),
};

async function runSystemTest() {
    console.log('\n=== 🏁 STARTING SYSTEM INTEGRATION TEST ===');

    // 1. Connect to Database
    check.info('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URL);
    check.pass('Connected to database successfully.');

    // 2. Cleanup Old Test Data (to ensure clean slate)
    check.info('Cleaning up any leftover test data from previous runs...');
    try {
        const oldUsers = await User.find({ email: { $in: [TEACHER_EMAIL, ...STUDENT_EMAILS] } });
        const oldUserIds = oldUsers.map(u => u._id);
        
        await CheatingLog.deleteMany({ student: { $in: oldUserIds } });
        await ExamAttempt.deleteMany({ student: { $in: oldUserIds } });
        
        const deletedSessions = await ExamSession.deleteMany({ createdBy: { $in: oldUserIds } });
        const deletedExams = await Exam.deleteMany({ createdBy: { $in: oldUserIds } });
        const deletedUsers = await User.deleteMany({ _id: { $in: oldUserIds } });
        
        check.pass(`Cleaned up old records: ${deletedUsers.deletedCount} users, ${deletedExams.deletedCount} exams, ${deletedSessions.deletedCount} sessions.`);
    } catch (e) {
        check.fail(`Cleanup failed: ${e.message}`);
    }

    // 3. Create Teacher and Student Accounts directly in DB
    check.info('Creating test accounts in MongoDB...');
    let teacherUser;
    const studentUsers = [];
    try {
        teacherUser = await User.create({
            title: 'นาย',
            firstName: 'SystemTest',
            lastName: 'Teacher',
            email: TEACHER_EMAIL,
            phoneNumber: '0899999999',
            password: 'password123',
            role: 'teacher'
        });
        check.pass(`Created test teacher: ${teacherUser.email}`);

        for (let i = 0; i < STUDENT_EMAILS.length; i++) {
            const student = await User.create({
                title: 'นาย',
                firstName: 'SystemTest',
                lastName: `Student${i}`,
                email: STUDENT_EMAILS[i],
                phoneNumber: `081111111${i}`,
                password: 'password123',
                role: 'student'
            });
            studentUsers.push(student);
        }
        check.pass(`Created ${studentUsers.length} test students.`);
    } catch (e) {
        check.fail(`Account creation failed: ${e.message}`);
    }

    // 4. Initialize Axios Clients with Locally Signed JWTs
    check.info('Signing JWTs and initializing Axios API clients...');
    const teacherToken = jwt.sign({ id: teacherUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const teacherClient = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const students = studentUsers.map((user, index) => {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const ip = `192.168.1.${10 + index}`;
        return {
            id: user._id,
            email: user.email,
            token,
            client: axios.create({
                baseURL: API_URL,
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'X-Forwarded-For': ip
                }
            })
        };
    });
    check.pass('Clients initialized.');

    // 5. Create Exam via API
    check.info('Teacher creating an exam via API...');
    let examData;
    try {
        const res = await teacherClient.post('/exams', {
            title: 'test_sys_System Integration Exam',
            durationMin: 30,
            questions: [
                {
                    questionId: 'q1',
                    type: 'radio',
                    prompt: 'What is 1 + 1?',
                    choices: [
                        { value: 'a', label: '1' },
                        { value: 'b', label: '2' },
                        { value: 'c', label: '3' }
                    ],
                    correctAnswer: 'b',
                    points: 2
                },
                {
                    questionId: 'q2',
                    type: 'radio',
                    prompt: 'What is the capital of Thailand?',
                    choices: [
                        { value: 'a', label: 'Bangkok' },
                        { value: 'b', label: 'Tokyo' },
                        { value: 'c', label: 'London' }
                    ],
                    correctAnswer: 'a',
                    points: 3
                },
                {
                    questionId: 'q3',
                    type: 'radio',
                    prompt: 'Is testing good?',
                    choices: [
                        { value: 'a', label: 'Yes' },
                        { value: 'b', label: 'No' }
                    ],
                    correctAnswer: 'a',
                    points: 5
                }
            ]
        });
        examData = res.data;
        check.pass(`Exam created successfully: ${examData.title} (${examData.examId})`);
    } catch (e) {
        check.fail(`Exam creation failed: ${e.response?.data?.message || e.message}`);
    }

    // 6. Start Exam Session via API
    check.info('Teacher starting the exam session...');
    let sessionData;
    try {
        const res = await teacherClient.post(`/exam-sessions/${examData._id}/start`, {
            qrRotateInterval: 10,
            shuffleQuestions: false,
            maxCheatEvents: 3
        });
        sessionData = res.data;
        check.pass(`Exam session started successfully. Session ID: ${sessionData._id}`);
    } catch (e) {
        check.fail(`Starting session failed: ${e.response?.data?.message || e.message}`);
    }

    // 7. Fetch QR Token
    check.info('Teacher fetching active QR Token...');
    let qrToken;
    try {
        const res = await teacherClient.get(`/exam-sessions/${examData._id}/qr`);
        qrToken = res.data.token;
        check.pass(`Fetched QR Token: ${qrToken.substring(0, 15)}...`);
    } catch (e) {
        check.fail(`Fetching QR Token failed: ${e.response?.data?.message || e.message}`);
    }

    // 8. Students Join Exam via API
    check.info('Students joining the exam session using QR Token...');
    for (const student of students) {
        try {
            await student.client.post(`/exam-sessions/${examData._id}/join`, {
                qrToken
            });
            check.pass(`Student ${student.email} joined successfully.`);
        } catch (e) {
            check.fail(`Student ${student.email} failed to join: ${e.response?.data?.message || e.message}`);
        }
    }

    // 9. Students Retrieve Attempt and Questions
    check.info('Students retrieving their attempt details...');
    for (const student of students) {
        try {
            const res = await student.client.get(`/exam-sessions/${examData._id}/attempt`);
            const { attempt, exam } = res.data;
            if (attempt.status !== 'in-progress') {
                check.fail(`Expected student status 'in-progress', got '${attempt.status}'`);
            }
            if (exam.questions.length !== 3) {
                check.fail(`Expected 3 questions in attempt, got ${exam.questions.length}`);
            }
        } catch (e) {
            check.fail(`Retrieving attempt failed: ${e.response?.data?.message || e.message}`);
        }
    }
    check.pass('All students retrieved attempts and correct question count.');

    // 10. Students Auto-saving and Logging Cheating Events
    check.info('Simulating students answering and logging cheat events...');
    // Student 0: Correct answers: q1:b (2pts), q2:a (3pts), q3:a (5pts). Total = 10pts. No cheating.
    // Student 1: Correct answers: q1:b (2pts), q2:b (incorrect, 0pts), q3:a (5pts). Total = 7pts. 1 cheat event.
    // Student 2: Correct answers: q1:a (incorrect, 0pts), q2:c (incorrect, 0pts), q3:a (5pts). Total = 5pts. 2 cheat events.
    
    const answers = [
        [{ questionId: 'q1', selectedAnswer: 'b' }, { questionId: 'q2', selectedAnswer: 'a' }, { questionId: 'q3', selectedAnswer: 'a' }],
        [{ questionId: 'q1', selectedAnswer: 'b' }, { questionId: 'q2', selectedAnswer: 'b' }, { questionId: 'q3', selectedAnswer: 'a' }],
        [{ questionId: 'q1', selectedAnswer: 'a' }, { questionId: 'q2', selectedAnswer: 'c' }, { questionId: 'q3', selectedAnswer: 'a' }]
    ];

    const cheats = [
        [],
        [{ eventType: 'tab_switch', detail: 'User switched tab once' }],
        [{ eventType: 'tab_switch', detail: 'User switched tab' }, { eventType: 'devtools', detail: 'User opened devtools' }]
    ];

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        // Auto-save
        try {
            await student.client.post(`/exam-sessions/${examData._id}/auto-save`, {
                answers: answers[i]
            });
            check.pass(`Student ${student.email} auto-saved answers.`);
        } catch (e) {
            check.fail(`Auto-save failed for student ${student.email}: ${e.response?.data?.message || e.message}`);
        }

        // Send Cheating Logs (if any)
        if (cheats[i].length > 0) {
            try {
                await student.client.post(`/exam-sessions/${examData._id}/cheat-log-batch`, {
                    events: cheats[i]
                });
                check.pass(`Student ${student.email} logged ${cheats[i].length} cheat events.`);
            } catch (e) {
                check.fail(`Cheat log failed for student ${student.email}: ${e.response?.data?.message || e.message}`);
            }
        }
    }

    // 11. Verify Student Status Check Endpoint
    check.info('Verifying student status endpoint output...');
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        try {
            const res = await student.client.get(`/exam-sessions/${examData._id}/my-status`);
            const status = res.data;
            
            if (status.status !== 'in-progress') {
                check.fail(`Expected student status 'in-progress', got '${status.status}'`);
            }
            if (status.sessionStatus !== 'active') {
                check.fail(`Expected session status 'active', got '${status.sessionStatus}'`);
            }
            check.pass(`Student ${student.email} status check ok (status: ${status.status}, sessionStatus: ${status.sessionStatus}).`);
        } catch (e) {
            check.fail(`Status check failed: ${e.response?.data?.message || e.message}`);
        }
    }

    // 12. Submit Exams and Verify Scores
    check.info('Students submitting exams and checking grades...');
    const expectedScores = [10, 7, 5];
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        try {
            const res = await student.client.post(`/exam-sessions/${examData._id}/submit`, {
                answers: answers[i]
            });
            const result = res.data;
            if (result.score !== expectedScores[i]) {
                check.fail(`Score mismatch for student ${student.email}. Expected ${expectedScores[i]}, got ${result.score}`);
            }
            check.pass(`Student ${student.email} submitted successfully. Score: ${result.score}/10`);
        } catch (e) {
            check.fail(`Submission failed for student ${student.email}: ${e.response?.data?.message || e.message}`);
        }
    }

    // 13. Verify Teacher Statistics and Pagination Data
    check.info('Teacher verifying session attempts and scores statistics...');
    try {
        const res = await teacherClient.get(`/exam-sessions/${examData._id}/attempts`);
        const attempts = res.data;
        
        if (attempts.length !== 3) {
            check.fail(`Expected 3 attempts, got ${attempts.length}`);
        }

        const scores = attempts.map(a => a.score);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        if (maxScore !== 10) check.fail(`Max score mismatch. Expected 10, got ${maxScore}`);
        if (minScore !== 5) check.fail(`Min score mismatch. Expected 5, got ${minScore}`);
        if (Math.abs(avgScore - 7.33) > 0.01) check.fail(`Avg score mismatch. Expected 7.33, got ${avgScore}`);

        check.pass(`Teacher attempts verification PASS (Min: ${minScore}, Max: ${maxScore}, Avg: ${avgScore.toFixed(2)})`);
    } catch (e) {
        check.fail(`Teacher attempts fetch failed: ${e.response?.data?.message || e.message}`);
    }

    // 14. Verify Student History Endpoint
    check.info('Students verifying their personal exam history endpoint...');
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        try {
            const res = await student.client.get('/users/me/history');
            const history = res.data;
            
            const foundAttempt = history.find(h => h.exam?._id === examData._id);
            if (!foundAttempt) {
                check.fail(`Could not find attempt for exam in history for student ${student.email}`);
            }
            
            if (foundAttempt.score !== expectedScores[i]) {
                check.fail(`Score in history mismatch for student ${student.email}. Expected ${expectedScores[i]}, got ${foundAttempt.score}`);
            }
            check.pass(`Student ${student.email} history verification PASS.`);
        } catch (e) {
            check.fail(`Fetching student history failed: ${e.response?.data?.message || e.message}`);
        }
    }

    // 15. Teacher Stopping the Session
    check.info('Teacher stopping the exam session...');
    try {
        await teacherClient.post(`/exam-sessions/${examData._id}/stop`);
        check.pass('Exam session stopped successfully.');
    } catch (e) {
        check.fail(`Stopping session failed: ${e.response?.data?.message || e.message}`);
    }

    // 16. Cleanup Database Records
    check.info('Cleaning up database records (removing exam, sessions, attempts, cheat logs, and test users)...');
    try {
        // Find session ID from DB using our exam
        const session = await ExamSession.findOne({ exam: examData._id });
        if (session) {
            // Delete session via API (which cleans up attempts and cheat logs)
            await teacherClient.delete(`/exam-sessions/${session._id}`);
            check.pass('Exam session deleted successfully via API.');
        }

        // Delete exam via API
        await teacherClient.delete(`/exams/${examData._id}`);
        check.pass('Exam deleted successfully via API.');

        // Delete users directly in database
        const userEmails = [TEACHER_EMAIL, ...STUDENT_EMAILS];
        const deletedUsers = await User.deleteMany({ email: { $in: userEmails } });
        check.pass(`Deleted ${deletedUsers.deletedCount} test users from database.`);
    } catch (e) {
        check.fail(`Cleanup failed: ${e.message}`);
    }

    check.info('Disconnecting from database...');
    await mongoose.disconnect();
    
    console.log('\n==========================================');
    console.log('🎉 ALL SYSTEM INTEGRATION TESTS PASSED! 🎉');
    console.log('==========================================\n');
    process.exit(0);
}

runSystemTest().catch(async (err) => {
    console.error('💥 UNEXPECTED ERROR IN TEST RUN:', err);
    try {
        await mongoose.disconnect();
    } catch {}
    process.exit(1);
});
