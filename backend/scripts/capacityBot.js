const axios = require('axios');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

dotenv.config();

const User = require('../src/models/userModel');
const Exam = require('../src/models/examModel');
const ExamSession = require('../src/models/examSessionModel');
const ExamAttempt = require('../src/models/examAttemptModel');
const CheatingLog = require('../src/models/cheatingLogModel');
const Category = require('../src/models/categoryModel');
const AttendanceSession = require('../src/models/attendanceSessionModel');

const DEFAULT_API_URL = 'https://farypor-api.dynv6.net/api';
const RUN_ID = process.env.BOT_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const PREFIX = process.env.BOT_PREFIX || `capacity_bot_${RUN_ID}`;
const API_URL = normalizeApiUrl(process.env.TEST_API_URL || process.env.API_URL || process.env.VITE_API_URL || DEFAULT_API_URL);
const NUM_USERS = readInt('BOT_USERS', 25);
const DURATION_SEC = readInt('BOT_DURATION_SEC', 30);
const JOIN_BATCH_SIZE = readInt('BOT_JOIN_BATCH_SIZE', 20);
const REQUEST_TIMEOUT_MS = readInt('BOT_TIMEOUT_MS', 20000);
const PASS_ERROR_RATE = readFloat('BOT_PASS_ERROR_RATE', 0.02);
const TEST_PASSWORD = process.env.BOT_PASSWORD || 'password123';

const created = {
    userIds: [],
    examIds: [],
    sessionIds: [],
    categoryIds: [],
    attendanceIds: [],
};

const metrics = {
    checks: {},
    requests: {},
    responseTimes: [],
    errors: [],
};

function normalizeApiUrl(value) {
    const trimmed = String(value || '').replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function readInt(name, fallback) {
    const parsed = Number.parseInt(process.env[name], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readFloat(name, fallback) {
    const parsed = Number.parseFloat(process.env[name]);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function nowLabel() {
    return new Date().toISOString();
}

function log(message) {
    console.log(`[${nowLabel()}] ${message}`);
}

function signToken(userId, expiresIn = '2h') {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
}

function makeClient(token, ipSuffix = 1) {
    return axios.create({
        baseURL: API_URL,
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
            Authorization: `Bearer ${token}`,
            'X-Forwarded-For': `10.77.${Math.floor(ipSuffix / 255)}.${(ipSuffix % 255) + 1}`,
        },
        validateStatus: () => true,
    });
}

function publicClient() {
    return axios.create({
        baseURL: API_URL,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
    });
}

function record(name, startedAt, ok, status, detail) {
    if (!metrics.requests[name]) {
        metrics.requests[name] = { ok: 0, fail: 0, statuses: {} };
    }
    const bucket = metrics.requests[name];
    if (ok) bucket.ok += 1;
    else bucket.fail += 1;
    bucket.statuses[status || 'ERR'] = (bucket.statuses[status || 'ERR'] || 0) + 1;

    if (startedAt) {
        metrics.responseTimes.push(Date.now() - startedAt);
    }
    if (!ok && metrics.errors.length < 20) {
        metrics.errors.push({ name, status, detail });
    }
}

async function request(name, client, method, url, data, expected = [200, 201]) {
    const startedAt = Date.now();
    try {
        const res = await client.request({ method, url, data });
        const ok = expected.includes(res.status);
        record(name, startedAt, ok, res.status, res.data?.message || res.statusText);
        if (!ok) {
            const err = new Error(`${name} failed with HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 300)}`);
            err.response = res;
            throw err;
        }
        return res.data;
    } catch (err) {
        if (!err.response) {
            record(name, startedAt, false, 'ERR', err.message);
        }
        throw err;
    }
}

async function optionalRequest(name, client, method, url, data, expected = [200, 201]) {
    try {
        return await request(name, client, method, url, data, expected);
    } catch (err) {
        log(`WARN optional ${name}: ${err.message}`);
        return null;
    }
}

async function capacityRequest(name, client, method, url, data, expected = [200, 201]) {
    try {
        return await request(name, client, method, url, data, expected);
    } catch {
        return null;
    }
}

function passCheck(name) {
    metrics.checks[name] = 'pass';
    log(`PASS ${name}`);
}

async function cleanupByPrefix() {
    log(`Cleanup started for prefix "${PREFIX}"`);
    const users = await User.find({
        $or: [
            { email: new RegExp(`^${escapeRegex(PREFIX)}`) },
            { firstName: PREFIX },
        ],
    }).select('_id');
    const userIds = users.map((u) => u._id);

    const exams = await Exam.find({
        $or: [
            { title: new RegExp(`^${escapeRegex(PREFIX)}`) },
            { createdBy: { $in: userIds } },
        ],
    }).select('_id');
    const examIds = exams.map((e) => e._id);

    const sessions = await ExamSession.find({
        $or: [
            { exam: { $in: examIds } },
            { createdBy: { $in: userIds } },
        ],
    }).select('_id');
    const sessionIds = sessions.map((s) => s._id);

    const categories = await Category.find({
        $or: [
            { name: new RegExp(`^${escapeRegex(PREFIX)}`) },
            { createdBy: { $in: userIds } },
        ],
    }).select('_id');
    const categoryIds = categories.map((c) => c._id);

    const attendance = await AttendanceSession.find({
        $or: [
            { name: new RegExp(`^${escapeRegex(PREFIX)}`) },
            { category: { $in: categoryIds } },
            { createdBy: { $in: userIds } },
        ],
    }).select('_id');
    const attendanceIds = attendance.map((a) => a._id);

    const [logs, attempts, deletedAttendance, deletedSessions, deletedExams, deletedCategories, deletedUsers] = await Promise.all([
        CheatingLog.deleteMany({ $or: [{ session: { $in: sessionIds } }, { student: { $in: userIds } }] }),
        ExamAttempt.deleteMany({ $or: [{ session: { $in: sessionIds } }, { student: { $in: userIds } }] }),
        AttendanceSession.deleteMany({ _id: { $in: attendanceIds } }),
        ExamSession.deleteMany({ _id: { $in: sessionIds } }),
        Exam.deleteMany({ _id: { $in: examIds } }),
        Category.deleteMany({ _id: { $in: categoryIds } }),
        User.deleteMany({ _id: { $in: userIds } }),
    ]);

    log(`Cleanup done: users=${deletedUsers.deletedCount}, exams=${deletedExams.deletedCount}, sessions=${deletedSessions.deletedCount}, attempts=${attempts.deletedCount}, logs=${logs.deletedCount}, categories=${deletedCategories.deletedCount}, attendance=${deletedAttendance.deletedCount}`);
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createUsers() {
    const teacher = await User.create({
        title: 'นาย',
        firstName: PREFIX,
        lastName: 'Teacher',
        email: `${PREFIX}_teacher@example.com`,
        phoneNumber: '0899999999',
        password: TEST_PASSWORD,
        role: 'teacher',
    });
    created.userIds.push(teacher._id);

    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    const students = await User.insertMany(Array.from({ length: NUM_USERS }, (_, i) => ({
        title: 'นาย',
        firstName: PREFIX,
        lastName: `Student${String(i + 1).padStart(4, '0')}`,
        email: `${PREFIX}_student_${String(i + 1).padStart(4, '0')}@example.com`,
        phoneNumber: `081${String(i + 1).padStart(7, '0')}`,
        password: hash,
        role: 'student',
    })));
    created.userIds.push(...students.map((s) => s._id));

    const throwaway = await User.create({
        title: 'นาย',
        firstName: PREFIX,
        lastName: 'Throwaway',
        email: `${PREFIX}_throwaway@example.com`,
        phoneNumber: '0829999999',
        password: TEST_PASSWORD,
        role: 'student',
    });
    created.userIds.push(throwaway._id);

    passCheck(`created ${students.length} virtual students`);
    return { teacher, students, throwaway };
}

function examPayload(categoryId) {
    return {
        title: `${PREFIX} full function exam`,
        durationMin: 60,
        category: String(categoryId),
        questions: [
            {
                questionId: 'q1',
                type: 'radio',
                prompt: '2 + 2 = ?',
                choices: [
                    { value: 'a', label: '3' },
                    { value: 'b', label: '4' },
                    { value: 'c', label: '5' },
                ],
                correctAnswer: 'b',
                points: 5,
            },
            {
                questionId: 'q2',
                type: 'radio',
                prompt: 'Select A',
                choices: [
                    { value: 'a', label: 'A' },
                    { value: 'b', label: 'B' },
                ],
                correctAnswer: 'a',
                points: 5,
            },
        ],
    };
}

function answerPayload(correct = true) {
    return {
        answers: [
            { questionId: 'q1', selectedAnswer: correct ? 'b' : 'a' },
            { questionId: 'q2', selectedAnswer: 'a' },
        ],
    };
}

async function runLimitedPool(items, limit, worker) {
    const results = [];
    let index = 0;
    async function next() {
        const current = index;
        index += 1;
        if (current >= items.length) return;
        results[current] = await worker(items[current], current);
        await next();
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
    return results;
}

async function joinInBatches(students, teacherClient, examId, shortCode) {
    let qrToken = null;
    let latestShortCode = shortCode;
    for (let start = 0; start < students.length; start += JOIN_BATCH_SIZE) {
        const batch = students.slice(start, start + JOIN_BATCH_SIZE);
        const qr = await request('exam.qr', teacherClient, 'get', `/exam-sessions/${examId}/qr`);
        qrToken = qr.token;
        latestShortCode = qr.shortCode || latestShortCode;
        await Promise.all(batch.map((student, batchIndex) => {
            if (start === 0 && batchIndex === 0 && latestShortCode) {
                return request('exam.joinByCode', student.client, 'post', '/exam-sessions/join-by-code', { shortCode: latestShortCode });
            }
            return request('exam.join', student.client, 'post', `/exam-sessions/${examId}/join`, { qrToken });
        }));
        await sleep(250);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runActivity(students, teacherClient, examId) {
    log(`Active load phase: ${students.length} students for ${DURATION_SEC}s`);
    await runLimitedPool(students, 40, async (student) => {
        await capacityRequest('exam.attempt', student.client, 'get', `/exam-sessions/${examId}/attempt`);
        await capacityRequest('exam.myStatus', student.client, 'get', `/exam-sessions/${examId}/my-status`);
        await capacityRequest('exam.autoSave', student.client, 'post', `/exam-sessions/${examId}/auto-save`, answerPayload(true));
    });

    const endAt = Date.now() + (DURATION_SEC * 1000);
    while (Date.now() < endAt) {
        await runLimitedPool(students, 50, async (student, i) => {
            await capacityRequest('exam.myStatus', student.client, 'get', `/exam-sessions/${examId}/my-status`);
            if (i % 3 === 0) {
                await capacityRequest('exam.autoSave', student.client, 'post', `/exam-sessions/${examId}/auto-save`, answerPayload(i % 2 === 0));
            }
            if (i % 10 === 0) {
                await capacityRequest('exam.cheatBatch', student.client, 'post', `/exam-sessions/${examId}/cheat-log-batch`, {
                    events: [{ eventType: 'focus', detail: 'capacity bot benign focus event' }],
                });
            }
        });
        await sleep(5000);
    }

    await request('exam.cheatLog', students[0].client, 'post', `/exam-sessions/${examId}/cheat-log`, {
        eventType: 'focus',
        detail: 'single event endpoint check',
    });
    await request('exam.cheatLogs', teacherClient, 'get', `/exam-sessions/${examId}/cheat-logs`);
    await request('exam.studentLogs', teacherClient, 'get', `/exam-sessions/${examId}/students/${students[0].id}/logs`);
    await request('exam.suspend', teacherClient, 'post', `/exam-sessions/${examId}/students/${students[0].id}/suspend`, { suspend: true });
    await request('exam.unsuspend', teacherClient, 'post', `/exam-sessions/${examId}/students/${students[0].id}/suspend`, { suspend: false });
    await request('exam.attempts', teacherClient, 'get', `/exam-sessions/${examId}/attempts`);

    await runLimitedPool(students, 40, async (student, i) => {
        await capacityRequest('exam.submit', student.client, 'post', `/exam-sessions/${examId}/submit`, answerPayload(i % 5 !== 0));
    });
}

async function run() {
    if (!process.env.MONGODB_URL || !process.env.JWT_SECRET) {
        throw new Error('MONGODB_URL and JWT_SECRET are required in backend/.env or environment');
    }

    log(`Capacity bot target: ${API_URL}`);
    log(`Run id: ${RUN_ID}, users: ${NUM_USERS}, duration: ${DURATION_SEC}s`);

    await request('health', publicClient(), 'get', '/health');
    passCheck('api health');

    await mongoose.connect(process.env.MONGODB_URL);
    passCheck('database connection');

    await cleanupByPrefix();
    const { teacher, students, throwaway } = await createUsers();

    const teacherClient = makeClient(signToken(teacher._id), 1);
    const studentClients = students.map((student, i) => ({
        id: student._id,
        email: student.email,
        client: makeClient(signToken(student._id), i + 10),
    }));

    await request('users.loginTeacher', publicClient(), 'post', '/users/login', { email: teacher.email, password: TEST_PASSWORD });
    await request('users.loginStudent', publicClient(), 'post', '/users/login', { email: students[0].email, password: TEST_PASSWORD });
    await optionalRequest('users.announcements', studentClients[0].client, 'get', '/users/announcements');
    await optionalRequest('users.readAnnouncement', studentClients[0].client, 'put', '/users/me/read-announcement', { announcementId: `${PREFIX}_announcement` });
    await optionalRequest('users.seenTutorial', teacherClient, 'put', '/users/me/seen-tutorial', { tutorialId: `${PREFIX}_tutorial` });

    const category = await request('categories.create', teacherClient, 'post', '/exams/categories', { name: `${PREFIX} category` });
    created.categoryIds.push(category._id);
    await request('categories.list', teacherClient, 'get', '/exams/categories');
    await request('categories.update', teacherClient, 'put', `/exams/categories/${category._id}`, { name: `${PREFIX} category updated` });
    await request('categories.archive', teacherClient, 'put', `/exams/categories/${category._id}/archive`);
    await request('categories.restore', teacherClient, 'put', `/exams/categories/${category._id}/restore`);
    await request('categories.join', studentClients[0].client, 'post', '/exams/categories/join', { code: category.joinCode });
    await request('categories.myJoined', studentClients[0].client, 'get', '/exams/categories/my-joined');

    const importRows = students.slice(1).map((student, i) => ({
        rowNumber: i + 2,
        studentCode: student.email.split('@')[0],
        email: student.email,
    }));
    await request('categories.importPreview', teacherClient, 'post', `/exams/categories/${category._id}/students/import/preview`, { rows: importRows, matchMode: 'email' });
    await request('categories.importConfirm', teacherClient, 'post', `/exams/categories/${category._id}/students/import/confirm`, { rows: importRows, matchMode: 'email' });
    await request('categories.students', teacherClient, 'get', `/exams/categories/${category._id}/students`);
    await request('categories.manualAddStudent', teacherClient, 'post', `/exams/categories/${category._id}/students`, { searchQuery: throwaway.email });
    await request('categories.removeStudent', teacherClient, 'delete', `/exams/categories/${category._id}/students/${throwaway._id}`);

    await request('users.students', teacherClient, 'get', '/users/students?limit=10');
    await request('users.exportStudents', teacherClient, 'get', `/users/students/export?search=${encodeURIComponent(PREFIX)}`);
    await request('users.update', teacherClient, 'put', `/users/${throwaway._id}`, { firstName: PREFIX, lastName: 'UpdatedThrowaway' });
    await request('users.resetPassword', teacherClient, 'put', `/users/${throwaway._id}/reset-password`, { newPassword: TEST_PASSWORD });

    const attendance = await request('attendance.create', teacherClient, 'post', '/attendance', {
        categoryId: category._id,
        name: `${PREFIX} attendance`,
        qrRotateInterval: 10,
    });
    created.attendanceIds.push(attendance._id);
    await request('attendance.list', teacherClient, 'get', `/attendance/category/${category._id}`);
    await request('attendance.get', teacherClient, 'get', `/attendance/${attendance._id}`);
    const rotatedAttendance = await request('attendance.rotate', teacherClient, 'post', `/attendance/${attendance._id}/rotate`);
    await runLimitedPool(studentClients, 40, async (student) => {
        await request('attendance.join', student.client, 'post', '/attendance/join', { code: rotatedAttendance.shortCode });
    });
    await request('attendance.manual', teacherClient, 'post', `/attendance/${attendance._id}/manual`, {
        studentId: students[0]._id,
        status: 'late',
        remark: 'capacity bot manual update',
    });
    await request('attendance.update', teacherClient, 'put', `/attendance/${attendance._id}`, { name: `${PREFIX} attendance updated` });
    await request('attendance.statusClosed', teacherClient, 'post', `/attendance/${attendance._id}/status`, { status: 'closed' });
    await request('attendance.statusActive', teacherClient, 'post', `/attendance/${attendance._id}/status`, { status: 'active', qrRotateInterval: 10 });

    const exam = await request('exams.create', teacherClient, 'post', '/exams', examPayload(category._id));
    created.examIds.push(exam._id);
    await request('exams.list', teacherClient, 'get', '/exams');
    await request('exams.get', teacherClient, 'get', `/exams/${exam._id}`);
    await request('exams.update', teacherClient, 'put', `/exams/${exam._id}`, {
        title: `${PREFIX} full function exam updated`,
        durationMin: 60,
        questions: examPayload(category._id).questions,
        category: String(category._id),
    });

    const session = await request('exam.start', teacherClient, 'post', `/exam-sessions/${exam._id}/start`, {
        qrRotateInterval: 10,
        shuffleQuestions: true,
        maxCheatEvents: 100,
        cheatConfig: {
            tabSwitch: true,
            windowBlur: true,
            copyPaste: true,
            rightClick: true,
            printScreen: true,
            devTools: true,
            forbiddenKeys: true,
        },
    });
    created.sessionIds.push(session._id);
    const qr = await request('exam.qrInitial', teacherClient, 'get', `/exam-sessions/${exam._id}/qr`);
    await request('exam.status', teacherClient, 'get', `/exam-sessions/${exam._id}/status`);
    await joinInBatches(studentClients, teacherClient, exam._id, qr.shortCode);
    await runActivity(studentClients, teacherClient, exam._id);
    await request('exam.history', teacherClient, 'get', `/exam-sessions/${exam._id}/history`);
    await request('users.studentHistory', studentClients[0].client, 'get', '/users/me/history');
    await request('exam.stop', teacherClient, 'post', `/exam-sessions/${exam._id}/stop`);

    await optionalRequest('exam.deleteSession', teacherClient, 'delete', `/exam-sessions/${session._id}`);
    await optionalRequest('attendance.delete', teacherClient, 'delete', `/attendance/${attendance._id}`);
    await optionalRequest('exams.delete', teacherClient, 'delete', `/exams/${exam._id}`);
    await optionalRequest('users.deleteThrowaway', teacherClient, 'delete', `/users/${throwaway._id}`);
    await optionalRequest('categories.delete', teacherClient, 'delete', `/exams/categories/${category._id}`);

    await cleanupByPrefix();
    printReport();
}

function printReport() {
    const totalOk = Object.values(metrics.requests).reduce((sum, item) => sum + item.ok, 0);
    const totalFail = Object.values(metrics.requests).reduce((sum, item) => sum + item.fail, 0);
    const total = totalOk + totalFail;
    const failRate = total ? totalFail / total : 0;
    const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
    const avg = sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
    const p95 = percentile(sorted, 0.95);
    const p99 = percentile(sorted, 0.99);
    const capacityVerdict = failRate <= PASS_ERROR_RATE ? `PASS at ${NUM_USERS} users` : `FAIL at ${NUM_USERS} users`;

    console.log('\n================ CAPACITY BOT REPORT ================');
    console.log(`Target API:          ${API_URL}`);
    console.log(`Run ID:              ${RUN_ID}`);
    console.log(`Virtual students:    ${NUM_USERS}`);
    console.log(`Active load seconds: ${DURATION_SEC}`);
    console.log(`Total requests:      ${total}`);
    console.log(`Success:             ${totalOk}`);
    console.log(`Failed:              ${totalFail}`);
    console.log(`Failure rate:        ${(failRate * 100).toFixed(2)}%`);
    console.log(`Avg response:        ${avg} ms`);
    console.log(`P95 response:        ${p95} ms`);
    console.log(`P99 response:        ${p99} ms`);
    console.log(`Verdict:             ${capacityVerdict}`);
    console.log('Cleanup:             completed');
    console.log('\nEndpoint summary:');
    for (const [name, item] of Object.entries(metrics.requests)) {
        console.log(`  ${name.padEnd(28)} ok=${String(item.ok).padStart(4)} fail=${String(item.fail).padStart(4)} statuses=${JSON.stringify(item.statuses)}`);
    }
    if (metrics.errors.length) {
        console.log('\nFirst errors:');
        for (const err of metrics.errors) {
            console.log(`  ${err.name}: ${err.status} ${err.detail}`);
        }
    }
    console.log('=====================================================\n');
}

function percentile(sorted, ratio) {
    if (!sorted.length) return 0;
    const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
    return sorted[index];
}

run()
    .catch(async (err) => {
        console.error(`\nCAPACITY BOT FAILED: ${err.stack || err.message}`);
        try {
            if (mongoose.connection.readyState === 1) {
                await cleanupByPrefix();
            }
        } catch (cleanupErr) {
            console.error(`Cleanup after failure failed: ${cleanupErr.message}`);
        }
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
