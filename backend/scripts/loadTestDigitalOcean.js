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
const NUM_USERS = 300;
const DURATION_SEC = 30;

const TEACHER_EMAIL = 'test_teacher_load@exam.com';
const STUDENT_EMAIL_PREFIX = 'test_student_load';

// Track metrics
const metrics = {
    joinSuccess: 0,
    joinFail: 0,
    statusCheckSuccess: 0,
    statusCheckFail: 0,
    autoSaveSuccess: 0,
    autoSaveFail: 0,
    cheatLogSuccess: 0,
    cheatLogFail: 0,
    submitSuccess: 0,
    submitFail: 0,
    responseTimes: [],
};

const check = {
    pass: (msg) => console.log(`  ✅ [PASS] ${msg}`),
    fail: (msg) => {
        console.error(`  ❌ [FAIL] ${msg}`);
        process.exit(1);
    },
    info: (msg) => console.log(`  ℹ️ [INFO] ${msg}`),
};

async function runLoadTest() {
    console.log(`🚀 Load Test v3 (DigitalOcean Production Environment)`);
    console.log(`   Target API: ${API_URL}`);
    console.log(`   Simulated Students: ${NUM_USERS} | Duration: ${DURATION_SEC}s\n`);

    // 1. Connect to Database
    check.info('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URL);
    check.pass('Connected to database.');

    // 2. Clean up old load test records
    check.info('Cleaning up any leftover load test data...');
    try {
        const oldUsers = await User.find({ 
            $or: [
                { email: TEACHER_EMAIL },
                { email: new RegExp(`^${STUDENT_EMAIL_PREFIX}`) }
            ]
        });
        const oldUserIds = oldUsers.map(u => u._id);
        
        await CheatingLog.deleteMany({ student: { $in: oldUserIds } });
        await ExamAttempt.deleteMany({ student: { $in: oldUserIds } });
        await ExamSession.deleteMany({ createdBy: { $in: oldUserIds } });
        await Exam.deleteMany({ createdBy: { $in: oldUserIds } });
        const deletedUsers = await User.deleteMany({ _id: { $in: oldUserIds } });
        
        check.pass(`Cleaned up ${deletedUsers.deletedCount} old test users.`);
    } catch (e) {
        check.fail(`Cleanup failed: ${e.message}`);
    }

    // 3. Create Teacher Account in DB
    check.info('Creating test teacher in DB...');
    let teacherUser;
    try {
        teacherUser = await User.create({
            title: 'นาย',
            firstName: 'LoadTest',
            lastName: 'Teacher',
            email: TEACHER_EMAIL,
            phoneNumber: '0899999999',
            password: 'password123',
            role: 'teacher'
        });
        check.pass(`Teacher created: ${teacherUser.email}`);
    } catch (e) {
        check.fail(`Teacher creation failed: ${e.message}`);
    }

    // 4. Create Exam via API
    check.info('Creating test exam via API...');
    const teacherToken = jwt.sign({ id: teacherUser._id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    const teacherClient = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${teacherToken}` },
        timeout: 15000,
    });

    let examData;
    try {
        const res = await teacherClient.post('/exams', {
            title: 'test_load_High Concurrency Exam',
            durationMin: 60,
            questions: [
                {
                    questionId: 'q1',
                    type: 'radio',
                    prompt: 'What is 2 + 2?',
                    choices: [
                        { value: 'a', label: '3' },
                        { value: 'b', label: '4' },
                        { value: 'c', label: '5' }
                    ],
                    correctAnswer: 'b',
                    points: 5
                },
                {
                    questionId: 'q2',
                    type: 'radio',
                    prompt: 'Is DigitalOcean reliable?',
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
        check.pass(`Exam created: ${examData.title} (${examData.examId})`);
    } catch (e) {
        check.fail(`Exam creation failed: ${e.response?.data?.message || e.message}`);
    }

    // 5. Start Exam Session
    check.info('Starting exam session...');
    let sessionData;
    try {
        const res = await teacherClient.post(`/exam-sessions/${examData._id}/start`, {
            qrRotateInterval: 10,
            shuffleQuestions: false,
            maxCheatEvents: 5
        });
        sessionData = res.data;
        check.pass(`Session started: ${sessionData._id}`);
    } catch (e) {
        check.fail(`Starting session failed: ${e.response?.data?.message || e.message}`);
    }

    // 6. Get QR Token
    let qrToken;
    try {
        const res = await teacherClient.get(`/exam-sessions/${examData._id}/qr`);
        qrToken = res.data.token;
        check.pass(`Fetched QR Token.`);
    } catch (e) {
        check.fail(`Fetching QR Token failed: ${e.response?.data?.message || e.message}`);
    }

    // 7. Prepare virtual student accounts in DB (using bulk write to save time)
    check.info(`Preparing ${NUM_USERS} virtual student accounts in DB...`);
    const studentUsers = [];
    const userBulk = [];
    for (let i = 0; i < NUM_USERS; i++) {
        userBulk.push({
            title: 'นาย',
            firstName: 'Load',
            lastName: `Student ${i}`,
            email: `${STUDENT_EMAIL_PREFIX}${i}@exam.com`,
            phoneNumber: '0812345678',
            password: 'password123',
            role: 'student'
        });
    }

    try {
        // We do save loop or insertMany. Since we have a pre-save hook for password encryption, 
        // we can use standard inserts or save loops to make sure password encrypts correctly.
        // Let's use User.create in small batches or insertMany if we hash passwords beforehand.
        // To be safe and fast, let's hash passwords beforehand and insertMany, or create them in parallel batches.
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        
        const docs = userBulk.map(u => ({ ...u, password: hashedPassword }));
        const createdUsers = await User.insertMany(docs);
        studentUsers.push(...createdUsers);
        check.pass(`Created ${studentUsers.length} students in DB.`);
    } catch (e) {
        check.fail(`Failed to create students: ${e.message}`);
    }

    // 8. Sign student JWTs and create clients
    check.info('Signing JWT tokens for all virtual students...');
    const students = studentUsers.map((user, i) => {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const ip = `${10 + Math.floor(i / 255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${(i % 255) + 1}`;
        return {
            id: user._id,
            email: user.email,
            token,
            client: axios.create({
                baseURL: API_URL,
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'X-Forwarded-For': ip,
                },
                timeout: 15000,
            })
        };
    });
    check.pass('JWTs signed and clients initialized.');

    // 9. Phase 1: Join exam (staggered over 5 seconds)
    check.info(`Phase 1: Joining exam session (${NUM_USERS} users staggered)...`);
    const joinStart = Date.now();
    const joinBatchSize = 30;
    const joinBatches = Math.ceil(NUM_USERS / joinBatchSize);

    for (let batch = 0; batch < joinBatches; batch++) {
        const startIdx = batch * joinBatchSize;
        const endIdx = Math.min(startIdx + joinBatchSize, NUM_USERS);
        const joinPromises = [];

        // Fetch fresh QR token to simulate real flow
        try {
            const qrRes = await teacherClient.get(`/exam-sessions/${examData._id}/qr`);
            qrToken = qrRes.data.token;
        } catch (e) {
            // Keep previous token if fetch fails
        }

        for (let i = startIdx; i < endIdx; i++) {
            const t0 = Date.now();
            joinPromises.push(
                students[i].client.post(`/exam-sessions/${examData._id}/join`, { qrToken })
                    .then(() => {
                        metrics.joinSuccess++;
                        metrics.responseTimes.push(Date.now() - t0);
                    })
                    .catch((err) => {
                        metrics.joinFail++;
                        if (metrics.joinFail === 1) {
                            console.error('  ⚠️ First join error details:', err.response?.data || err.message);
                        }
                    })
            );
        }

        await Promise.all(joinPromises);
        if (batch < joinBatches - 1) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    const joinDuration = Date.now() - joinStart;
    check.pass(`Joined: ${metrics.joinSuccess} successful / ${metrics.joinFail} failed (${joinDuration}ms)`);

    // 10. Phase 2: Active Load (Status Polling + Auto-save + Cheat logging)
    check.info(`Phase 2: Simulating active exam load for ${DURATION_SEC} seconds...`);
    const endTime = Date.now() + DURATION_SEC * 1000;
    const intervals = [];

    // Simulate student status checks every 10s
    for (const student of students) {
        intervals.push(setInterval(async () => {
            if (Date.now() > endTime) return;
            const t0 = Date.now();
            try {
                await student.client.get(`/exam-sessions/${examData._id}/my-status`);
                metrics.statusCheckSuccess++;
                metrics.responseTimes.push(Date.now() - t0);
            } catch {
                metrics.statusCheckFail++;
            }
        }, 10000));

        // Simulate student auto-saving every 15s
        intervals.push(setInterval(async () => {
            if (Date.now() > endTime) return;
            const t0 = Date.now();
            try {
                await student.client.post(`/exam-sessions/${examData._id}/auto-save`, {
                    answers: [
                        { questionId: 'q1', selectedAnswer: Math.random() > 0.3 ? 'b' : 'a' },
                        { questionId: 'q2', selectedAnswer: 'a' }
                    ]
                });
                metrics.autoSaveSuccess++;
                metrics.responseTimes.push(Date.now() - t0);
            } catch {
                metrics.autoSaveFail++;
            }
        }, 15000));
    }

    // Simulate 10% of students generating cheat logs every 5s
    intervals.push(setInterval(async () => {
        if (Date.now() > endTime) return;
        const numCheaters = Math.ceil(NUM_USERS * 0.1);
        for (let k = 0; k < numCheaters; k++) {
            const randomStudent = students[Math.floor(Math.random() * NUM_USERS)];
            const t0 = Date.now();
            randomStudent.client.post(`/exam-sessions/${examData._id}/cheat-log-batch`, {
                events: [{ eventType: 'tab_switch', detail: 'Tab switched during load test' }]
            }).then(() => {
                metrics.cheatLogSuccess++;
                metrics.responseTimes.push(Date.now() - t0);
            }).catch(() => {
                metrics.cheatLogFail++;
            });
        }
    }, 5000));

    // Trigger initial status check immediately
    const initialStatusChecks = students.map(student => {
        const t0 = Date.now();
        return student.client.get(`/exam-sessions/${examData._id}/my-status`)
            .then(() => {
                metrics.statusCheckSuccess++;
                metrics.responseTimes.push(Date.now() - t0);
            })
            .catch(() => {
                metrics.statusCheckFail++;
            });
    });
    await Promise.all(initialStatusChecks);
    check.info(`   Initial status polling triggered for all ${NUM_USERS} users.`);

    // Wait for the duration of the load test
    await new Promise(r => setTimeout(r, DURATION_SEC * 1000));
    intervals.forEach(clearInterval);
    check.pass('Active exam load simulation completed.');

    // 11. Phase 3: Final Submissions
    check.info(`Phase 3: Submitting final exam attempts for all students...`);
    const submitStart = Date.now();
    const submitPromises = students.map(student => {
        const t0 = Date.now();
        return student.client.post(`/exam-sessions/${examData._id}/submit`, {
            answers: [
                { questionId: 'q1', selectedAnswer: 'b' }, // Correct
                { questionId: 'q2', selectedAnswer: 'a' }  // Correct
            ]
        }).then(() => {
            metrics.submitSuccess++;
            metrics.responseTimes.push(Date.now() - t0);
        }).catch((err) => {
            metrics.submitFail++;
            if (metrics.submitFail === 1) {
                console.error('  ⚠️ First submit error details:', err.response?.data || err.message);
            }
        });
    });
    await Promise.all(submitPromises);
    const submitDuration = Date.now() - submitStart;
    check.pass(`Submissions: ${metrics.submitSuccess} successful / ${metrics.submitFail} failed (${submitDuration}ms)`);

    // 12. Display metrics summary
    const totalRequests = metrics.responseTimes.length;
    const avgResponse = totalRequests > 0
        ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / totalRequests)
        : 'N/A';
    const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
    const p95 = totalRequests > 0 ? sortedTimes[Math.floor(totalRequests * 0.95)] : 'N/A';
    const p99 = totalRequests > 0 ? sortedTimes[Math.floor(totalRequests * 0.99)] : 'N/A';

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 LOAD TEST RESULTS (${DURATION_SEC}s)`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Total Simulated Students: ${NUM_USERS}`);
    console.log(`─── Join Exam ───`);
    console.log(`  Success:              ${metrics.joinSuccess}`);
    console.log(`  Failed:               ${metrics.joinFail}`);
    console.log(`─── Status Checks ───`);
    console.log(`  Success:              ${metrics.statusCheckSuccess}`);
    console.log(`  Failed:               ${metrics.statusCheckFail}`);
    console.log(`─── Auto-Save ───`);
    console.log(`  Success:              ${metrics.autoSaveSuccess}`);
    console.log(`  Failed:               ${metrics.autoSaveFail}`);
    console.log(`─── Cheat Logs ───`);
    console.log(`  Success:              ${metrics.cheatLogSuccess}`);
    console.log(`  Failed:               ${metrics.cheatLogFail}`);
    console.log(`─── Final Submissions ───`);
    console.log(`  Success:              ${metrics.submitSuccess}`);
    console.log(`  Failed:               ${metrics.submitFail}`);
    console.log(`─── Performance Metrics ───`);
    console.log(`  Total Requests:       ${totalRequests}`);
    console.log(`  Average Response:     ${avgResponse} ms`);
    console.log(`  P95 Response:         ${p95} ms`);
    console.log(`  P99 Response:         ${p99} ms`);
    console.log(`${'='.repeat(50)}\n`);

    // 13. Stop and delete everything safely
    check.info('Cleaning up all created test resources...');
    try {
        // Stop session via API
        await teacherClient.post(`/exam-sessions/${examData._id}/stop`);
        
        // Delete session via API (which handles deleting attempts and cheat logs)
        const session = await ExamSession.findOne({ exam: examData._id });
        if (session) {
            await teacherClient.delete(`/exam-sessions/${session._id}`);
            check.pass('Exam session deleted successfully via API.');
        }

        // Delete exam via API
        await teacherClient.delete(`/exams/${examData._id}`);
        check.pass('Exam deleted successfully via API.');

        // Delete users directly in DB
        const testUserIds = studentUsers.map(u => u._id);
        testUserIds.push(teacherUser._id);
        const deletedUsers = await User.deleteMany({ _id: { $in: testUserIds } });
        check.pass(`Deleted ${deletedUsers.deletedCount} test users from database.`);
    } catch (e) {
        check.fail(`Cleanup failed: ${e.message}`);
    }

    check.info('Disconnecting from database...');
    await mongoose.disconnect();
    
    console.log('\n==========================================');
    console.log('🎉 LOAD TEST COMPLETED SUCCESSFULLY! 🎉');
    console.log('==========================================\n');
    process.exit(0);
}

runLoadTest().catch(async (err) => {
    console.error('💥 UNEXPECTED ERROR IN LOAD TEST RUN:', err);
    try {
        await mongoose.disconnect();
    } catch {}
    process.exit(1);
});
