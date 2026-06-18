const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const User = require('../src/models/userModel');
const ExamSession = require('../src/models/examSessionModel');
const Exam = require('../src/models/examModel');

dotenv.config();

const API_URL = process.env.VITE_API_URL || 'http://localhost:5001/api';
const NUM_USERS = 300;
const DURATION_SEC = 30;

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
    responseTimes: [],
};

async function runLoadTest() {
    console.log(`🚀 Load Test v2 (HTTP-Only, No Socket.io)`);
    console.log(`   Target: ${API_URL}`);
    console.log(`   Users: ${NUM_USERS} | Duration: ${DURATION_SEC}s\n`);
    
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to Database');

    // Clean up any orphaned active sessions
    await ExamSession.updateMany({ status: 'active' }, { status: 'ended' });
    
    const exam = await Exam.findOne();
    if (!exam) {
        console.error('❌ No exam found. Create one first.');
        process.exit(1);
    }
    
    // Create new session via API requires a Teacher token
    const teacherToken = jwt.sign({ id: exam.createdBy }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const teacherClient = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${teacherToken}` }
    });

    console.log(`⏳ Starting fresh session via API for exam: ${exam.title}...`);
    let sessionRes;
    try {
        sessionRes = await teacherClient.post(`/exam-sessions/${exam._id}/start`, {
            qrRotateInterval: 10,
            shuffleQuestions: false,
            maxCheatEvents: 5
        });
    } catch (e) {
        console.error('❌ Failed to start session via API:', e.response?.data?.message || e.message);
        process.exit(1);
    }
    
    const session = sessionRes.data;
    console.log(`✅ Session: ${session._id} | Exam: ${exam.title}\n`);

    // Generate users
    console.log(`⏳ Preparing ${NUM_USERS} virtual students...`);
    const users = [];
    for (let i = 0; i < NUM_USERS; i++) {
        const email = `teststudent${i}@exam.com`;
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                title: 'นาย',
                firstName: `Test`,
                lastName: `Student ${i}`,
                email,
                phoneNumber: '0812345678',
                password: 'password123',
                role: 'student'
            });
        }
        
        const ip = `${10 + Math.floor(i / 255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${(i % 255) + 1}`;
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        users.push({
            id: user._id,
            token,
            ip,
            client: axios.create({
                baseURL: API_URL,
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'X-Forwarded-For': ip,
                },
                timeout: 10000,
            }),
        });
    }
    console.log(`✅ ${users.length} students ready\n`);

    // Phase 1: Join exam (staggered over 5 seconds to simulate real scan-in)
    console.log(`📋 Phase 1: Joining exam (staggered over 5s)...`);
    const joinStart = Date.now();

    const joinBatchSize = 30;
    for (let batch = 0; batch < Math.ceil(NUM_USERS / joinBatchSize); batch++) {
        const start = batch * joinBatchSize;
        const end = Math.min(start + joinBatchSize, NUM_USERS);
        const promises = [];
        
        // Fetch fresh QR token for this batch
        let validQrToken = 'fallback-token';
        try {
            const qrRes = await teacherClient.get(`/exam-sessions/${exam._id}/qr`);
            validQrToken = qrRes.data.token;
        } catch (e) {
            console.warn('⚠️ Failed to fetch QR token, join might fail', e.response?.data?.message || e.message);
        }
        
        for (let i = start; i < end; i++) {
            promises.push(
                users[i].client.post(`/exam-sessions/${exam._id}/join`, {
                    qrToken: validQrToken
                }).then(() => { metrics.joinSuccess++; })
                  .catch((e) => { 
                      metrics.joinFail++; 
                      if (metrics.joinFail === 1) console.error('⚠️ First Join Error:', e.response?.data || e.message);
                  })
            );
        }
        
        await Promise.all(promises);
        if (batch < Math.ceil(NUM_USERS / joinBatchSize) - 1) {
            await new Promise(r => setTimeout(r, 500)); // 500ms between batches
        }
    }
    
    const joinTime = Date.now() - joinStart;
    console.log(`✅ Join: ${metrics.joinSuccess} ok / ${metrics.joinFail} fail (${joinTime}ms)\n`);

    // Phase 2: Concurrent load (status checks + auto-save + cheat logs)
    console.log(`🔥 Phase 2: Simulating exam activity for ${DURATION_SEC}s...`);
    const endTime = Date.now() + DURATION_SEC * 1000;
    
    // Each student does: status check every 15s, auto-save every 45s, cheat log randomly
    const intervals = [];
    
    for (const u of users) {
        // Status check every 15s (like real students)
        intervals.push(setInterval(async () => {
            if (Date.now() > endTime) return;
            const t0 = Date.now();
            try {
                await u.client.get(`/exam-sessions/${exam._id}/my-status`);
                metrics.statusCheckSuccess++;
                metrics.responseTimes.push(Date.now() - t0);
            } catch { metrics.statusCheckFail++; }
        }, 15000));

        // Auto-save every 45s
        intervals.push(setInterval(async () => {
            if (Date.now() > endTime) return;
            const t0 = Date.now();
            try {
                await u.client.post(`/exam-sessions/${exam._id}/auto-save`, {
                    answers: [{ questionId: 'q1', selectedAnswer: 'a' }]
                });
                metrics.autoSaveSuccess++;
                metrics.responseTimes.push(Date.now() - t0);
            } catch { metrics.autoSaveFail++; }
        }, 45000));
    }

    // Random cheat events: 10% of users every 5s
    intervals.push(setInterval(async () => {
        if (Date.now() > endTime) return;
        for (let i = 0; i < NUM_USERS * 0.1; i++) {
            const u = users[Math.floor(Math.random() * NUM_USERS)];
            u.client.post(`/exam-sessions/${exam._id}/cheat-log-batch`, {
                events: [{ eventType: 'tab_switch', detail: 'Tab hidden' }]
            }).then(() => { metrics.cheatLogSuccess++; })
              .catch(() => { metrics.cheatLogFail++; });
        }
    }, 5000));

    // Trigger initial status check for all users right now
    const initialChecks = users.map(u => 
        u.client.get(`/exam-sessions/${exam._id}/my-status`)
            .then(() => { metrics.statusCheckSuccess++; })
            .catch(() => { metrics.statusCheckFail++; })
    );
    await Promise.all(initialChecks);
    console.log(`   Initial status check: ${metrics.statusCheckSuccess} ok / ${metrics.statusCheckFail} fail`);

    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, DURATION_SEC * 1000));
    intervals.forEach(clearInterval);

    // Results
    const avgResponse = metrics.responseTimes.length > 0 
        ? Math.round(metrics.responseTimes.reduce((a,b) => a+b, 0) / metrics.responseTimes.length)
        : 'N/A';
    const p95 = metrics.responseTimes.length > 0
        ? Math.round(metrics.responseTimes.sort((a,b) => a-b)[Math.floor(metrics.responseTimes.length * 0.95)])
        : 'N/A';

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 LOAD TEST RESULTS (${DURATION_SEC}s)`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Total Virtual Users:    ${NUM_USERS}`);
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
    console.log(`─── Performance ───`);
    console.log(`  Avg Response:         ${avgResponse}ms`);
    console.log(`  P95 Response:         ${p95}ms`);
    console.log(`${'='.repeat(50)}\n`);

    console.log(`🧹 Cleaning up test data...`);
    try {
        const ExamAttempt = require('../src/models/examAttemptModel');
        const CheatingLog = require('../src/models/cheatingLogModel');
        
        const testUserIds = users.map(u => u.id);
        
        const deletedLogs = await CheatingLog.deleteMany({ student: { $in: testUserIds } });
        const deletedAttempts = await ExamAttempt.deleteMany({ student: { $in: testUserIds } });
        const deletedUsers = await User.deleteMany({ _id: { $in: testUserIds } });
        
        console.log(`✅ Cleaned up: ${deletedUsers.deletedCount} users, ${deletedAttempts.deletedCount} attempts, ${deletedLogs.deletedCount} cheat logs.`);
    } catch (e) {
        console.error(`❌ Cleanup failed:`, e.message);
    }

    await mongoose.disconnect();
    process.exit(0);
}

runLoadTest().catch(console.error);
