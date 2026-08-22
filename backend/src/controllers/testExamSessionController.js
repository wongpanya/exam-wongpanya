const asyncHandler = require('express-async-handler');
const TestExam = require('../models/testExamModel');
const TestExamSession = require('../models/testExamSessionModel');
const TestExamAttempt = require('../models/testExamAttemptModel');
const { benchmarkAdHoc } = require('../services/grading/gradingService');
const { scoreExactAnswer } = require('../services/grading/attemptScoreService');

// Generate unique 6-digit short code
const generateShortCode = async () => {
    for (let i = 0; i < 10; i++) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await TestExamSession.findOne({ shortCode: code, status: 'active' });
        if (!existing) return code;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==================== TEST EXAM CRUD ====================

// POST /api/grading/test-exams
const createTestExam = asyncHandler(async (req, res) => {
    const { title, description, durationMin, questions, defaultModels } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        res.status(400);
        throw new Error('กรุณาระบุโจทย์ข้อสอบอย่างน้อย 1 ข้อ');
    }

    const testExam = await TestExam.create({
        title: title || 'ชุดข้อสอบจำลองทดสอบ AI',
        description: description || '',
        durationMin: Number(durationMin) || 30,
        questions,
        defaultModels: defaultModels || [],
        createdBy: req.user._id,
    });

    res.status(201).json(testExam);
});

// GET /api/grading/test-exams
const listTeacherTestExams = asyncHandler(async (req, res) => {
    const exams = await TestExam.find({ createdBy: req.user._id })
        .sort({ createdAt: -1 });
    res.json(exams);
});

// GET /api/grading/test-exams/:id
const getTestExam = asyncHandler(async (req, res) => {
    const exam = await TestExam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('ไม่พบชุดข้อสอบนี้');
    }
    if (String(exam.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์เข้าถึงชุดข้อสอบนี้');
    }
    res.json(exam);
});

// PUT /api/grading/test-exams/:id
const updateTestExam = asyncHandler(async (req, res) => {
    const { title, description, durationMin, questions, defaultModels } = req.body;
    const exam = await TestExam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('ไม่พบชุดข้อสอบนี้');
    }
    if (String(exam.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์แก้ไขชุดข้อสอบนี้');
    }

    exam.title = title ?? exam.title;
    exam.description = description ?? exam.description;
    exam.durationMin = durationMin ? Number(durationMin) : exam.durationMin;
    if (questions) exam.questions = questions;
    if (defaultModels) exam.defaultModels = defaultModels;

    await exam.save();
    res.json(exam);
});

// DELETE /api/grading/test-exams/:id
const deleteTestExam = asyncHandler(async (req, res) => {
    const exam = await TestExam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('ไม่พบชุดข้อสอบนี้');
    }
    if (String(exam.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์ลบชุดข้อสอบนี้');
    }

    await TestExam.findByIdAndDelete(req.params.id);
    res.json({ message: 'ลบชุดข้อสอบเรียบร้อยแล้ว' });
});

// ==================== TEST SESSION CONTROLLER ====================

// Background Worker: Process Multi-Model AI Evaluation for an attempt
const processAttemptEvaluations = async (attemptId, session, answersList) => {
    try {
        const answersMap = new Map((answersList || []).map(a => [a.questionId, a.selectedAnswer || '']));
        const evaluations = [];

        for (const q of session.questions) {
            const studentAnswer = answersMap.get(q.questionId) || '';

            if (q.type === 'text' && q.gradingMode === 'ai') {
                const rawRequest = {
                    question: q.prompt,
                    groundTruths: q.aiGrading?.groundTruths?.filter(Boolean) || [''],
                    studentAnswer,
                    rubric: (q.aiGrading?.rubricCriteria || []).map((item, idx) => ({
                        id: item.rubricId || `r-${idx + 1}`,
                        title: item.title || `เกณฑ์ที่ ${idx + 1}`,
                        description: item.description || '',
                        maxScore: Number(item.maxScore) || 1,
                    })),
                    keyConcepts: q.aiGrading?.keyConcepts?.filter(Boolean) || [],
                    maxScore: Number(q.points) || 5,
                    language: q.aiGrading?.language || 'th',
                };

                try {
                    const benchmarkRes = await benchmarkAdHoc(rawRequest, {
                        requestedBy: session.createdBy,
                        models: session.modelsToCompare,
                    });

                    const modelEvals = benchmarkRes.results.map(r => ({
                        provider: r.provider,
                        model: r.model,
                        label: r.label,
                        status: r.status,
                        totalScore: r.result?.totalScore ?? 0,
                        rubricScores: r.result?.rubricScores || [],
                        feedback: r.result?.feedback || '',
                        confidence: r.result?.confidence || 1,
                        latencyMs: r.latencyMs || 0,
                        inputTokens: r.result?.metadata?.inputTokens || 0,
                        outputTokens: r.result?.metadata?.outputTokens || 0,
                        estimatedCost: r.result?.metadata?.costUsd || 0,
                        error: r.error || '',
                    }));

                    evaluations.push({
                        questionId: q.questionId,
                        modelEvaluations: modelEvals,
                    });
                } catch (err) {
                    console.error(`AI Evaluation failed for question ${q.questionId}:`, err);
                    evaluations.push({
                        questionId: q.questionId,
                        modelEvaluations: session.modelsToCompare.map(m => ({
                            provider: m.provider,
                            model: m.model,
                            label: m.label,
                            status: 'failed',
                            totalScore: 0,
                            rubricScores: [],
                            error: err.message || 'Evaluation error',
                        })),
                    });
                }
            } else {
                // Objective choice (radio / checkbox)
                const exactScore = scoreExactAnswer(q, { questionId: q.questionId, selectedAnswer: studentAnswer });
                const modelEvals = session.modelsToCompare.map(m => ({
                    provider: m.provider,
                    model: m.model,
                    label: m.label,
                    status: 'succeeded',
                    totalScore: exactScore,
                    rubricScores: [],
                    feedback: exactScore === q.points ? 'ตอบถูกต้องครบถ้วน' : 'คำตอบไม่ถูกต้อง',
                    latencyMs: 0,
                }));

                evaluations.push({
                    questionId: q.questionId,
                    modelEvaluations: modelEvals,
                });
            }
        }

        await TestExamAttempt.findByIdAndUpdate(attemptId, {
            $set: {
                evaluations,
                gradingStatus: 'completed',
                completedAt: new Date(),
            },
        });
    } catch (error) {
        console.error(`Error processing attempt ${attemptId}:`, error);
        await TestExamAttempt.findByIdAndUpdate(attemptId, {
            $set: { gradingStatus: 'failed' },
        });
    }
};

// POST /api/grading/test-sessions
const createTestSession = asyncHandler(async (req, res) => {
    const { testExamId, title, description, durationMin, questions, modelsToCompare } = req.body;

    let finalQuestions = questions;
    let finalTitle = title;
    let finalDescription = description;
    let finalDuration = Number(durationMin) || 30;

    if (testExamId) {
        const exam = await TestExam.findById(testExamId);
        if (exam) {
            finalQuestions = exam.questions;
            finalTitle = title || exam.title;
            finalDescription = description !== undefined ? description : exam.description;
            finalDuration = Number(durationMin) || exam.durationMin || 30;
            exam.sessionCount += 1;
            await exam.save();
        }
    }

    if (!finalQuestions || !Array.isArray(finalQuestions) || finalQuestions.length === 0) {
        res.status(400);
        throw new Error('กรุณาระบุโจทย์ข้อสอบอย่างน้อย 1 ข้อ');
    }

    if (!modelsToCompare || !Array.isArray(modelsToCompare) || modelsToCompare.length === 0) {
        res.status(400);
        throw new Error('กรุณาเลือกโมเดล AI อย่างน้อย 1 โมเดล');
    }

    const shortCode = await generateShortCode();
    const autoStopAt = new Date(Date.now() + finalDuration * 60 * 1000);

    const session = await TestExamSession.create({
        testExam: testExamId || null,
        title: finalTitle || 'ห้องสอบจำลองทดสอบโมเดล AI',
        description: finalDescription || '',
        durationMin: finalDuration,
        autoStopAt,
        questions: finalQuestions,
        modelsToCompare,
        shortCode,
        status: 'active',
        createdBy: req.user._id,
    });

    res.status(201).json({
        session,
        shortCode,
        joinUrl: `/student/test-exam/${session._id}`,
    });
});

// GET /api/grading/test-sessions
const listTeacherTestSessions = asyncHandler(async (req, res) => {
    const { testExamId } = req.query;
    const filter = { createdBy: req.user._id };
    if (testExamId) filter.testExam = testExamId;

    const sessions = await TestExamSession.find(filter)
        .populate('testExam', 'title')
        .sort({ createdAt: -1 })
        .limit(50);
    res.json(sessions);
});

// GET /api/grading/test-sessions/:sessionId
const getTestSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    let session;
    if (/^[a-f\d]{24}$/i.test(sessionId)) {
        session = await TestExamSession.findById(sessionId);
    } else {
        session = await TestExamSession.findOne({ shortCode: sessionId, status: 'active' });
    }

    if (!session) {
        res.status(404);
        throw new Error('ไม่พบห้องสอบจำลองนี้ หรือห้องสอบได้ปิดไปแล้ว');
    }

    // Auto-close if expired
    if (session.status === 'active' && session.autoStopAt && new Date() > new Date(session.autoStopAt)) {
        session.status = 'ended';
        await session.save();
    }

    const isTeacher = req.user && String(session.createdBy) === String(req.user._id);
    const sanitizedQuestions = session.questions.map(q => {
        if (isTeacher) return q;
        return {
            questionId: q.questionId,
            type: q.type,
            prompt: q.prompt,
            choices: q.choices,
            points: q.points,
            gradingMode: q.gradingMode,
        };
    });

    res.json({
        _id: session._id,
        testExam: session.testExam,
        title: session.title,
        description: session.description,
        durationMin: session.durationMin,
        autoStopAt: session.autoStopAt,
        questions: sanitizedQuestions,
        modelsToCompare: session.modelsToCompare,
        shortCode: session.shortCode,
        status: session.status,
        submittedCount: session.submittedCount,
        isTeacher,
    });
});

// POST /api/grading/test-sessions/:sessionId/submit
const submitTestExam = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { answers } = req.body;

    const session = await TestExamSession.findById(sessionId);
    if (!session) {
        res.status(404);
        throw new Error('ไม่พบห้องสอบจำลองนี้');
    }

    // Check expiration
    if (session.autoStopAt && new Date() > new Date(session.autoStopAt)) {
        session.status = 'ended';
        await session.save();
    }

    if (session.status !== 'active') {
        res.status(400);
        throw new Error('ห้องสอบจำลองนี้ถูกปิดแล้ว หรือหมดเวลาทำข้อสอบแล้ว');
    }

    const existingAttempt = await TestExamAttempt.findOne({ session: session._id, student: req.user._id });
    if (existingAttempt) {
        res.status(409);
        throw new Error('คุณได้ส่งคำตอบสำหรับห้องสอบนี้ไปแล้ว');
    }

    const studentInfo = {
        firstName: req.user.firstName || '',
        lastName: req.user.lastName || '',
        email: req.user.email || '',
    };

    const formattedAnswers = (answers || []).map(a => ({
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer || '',
    }));

    const attempt = await TestExamAttempt.create({
        session: session._id,
        student: req.user._id,
        studentInfo,
        answers: formattedAnswers,
        gradingStatus: 'grading',
        evaluations: [],
        submittedAt: new Date(),
    });

    session.submittedCount += 1;
    await session.save();

    setImmediate(() => {
        processAttemptEvaluations(attempt._id, session, formattedAnswers);
    });

    res.status(201).json({
        message: 'ส่งคำตอบเรียบร้อยแล้ว ระบบกำลังตรวจคำตอบด้วยโมเดล AI ในพื้นหลัง',
        attemptId: attempt._id,
        gradingStatus: 'grading',
    });
});

// GET /api/grading/test-sessions/:sessionId/attempts/:attemptId
const getStudentAttemptStatus = asyncHandler(async (req, res) => {
    const { sessionId, attemptId } = req.params;
    const attempt = await TestExamAttempt.findOne({ _id: attemptId, session: sessionId });

    if (!attempt) {
        res.status(404);
        throw new Error('ไม่พบข้อมูลการส่งข้อสอบนี้');
    }

    if (String(attempt.student) !== String(req.user._id) && req.user.role !== 'teacher' && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์ดูผลการสอบนี้');
    }

    res.json({
        _id: attempt._id,
        session: attempt.session,
        studentInfo: attempt.studentInfo,
        gradingStatus: attempt.gradingStatus,
        answers: attempt.answers,
        evaluations: attempt.evaluations,
        submittedAt: attempt.submittedAt,
        completedAt: attempt.completedAt,
    });
});

// GET /api/grading/test-sessions/:sessionId/results
const getTestSessionResults = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await TestExamSession.findById(sessionId);
    if (!session) {
        res.status(404);
        throw new Error('ไม่พบห้องสอบจำลองนี้');
    }

    if (String(session.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์ดูผลลัพธ์ของห้องสอบนี้');
    }

    const attempts = await TestExamAttempt.find({ session: session._id })
        .populate('student', 'firstName lastName email')
        .sort({ submittedAt: -1 });

    const modelStats = new Map();
    session.modelsToCompare.forEach(m => {
        const key = `${m.provider}::${m.model}`;
        modelStats.set(key, {
            provider: m.provider,
            model: m.model,
            label: m.label,
            totalScores: [],
            latencies: [],
            tokensIn: 0,
            tokensOut: 0,
            successCount: 0,
            failCount: 0,
            evidenceQuotesCount: 0,
        });
    });

    attempts.forEach(attempt => {
        attempt.evaluations.forEach(qEval => {
            qEval.modelEvaluations.forEach(mEval => {
                const key = `${mEval.provider}::${mEval.model}`;
                const stat = modelStats.get(key);
                if (stat) {
                    if (mEval.status === 'succeeded') {
                        stat.totalScores.push(mEval.totalScore || 0);
                        stat.latencies.push(mEval.latencyMs || 0);
                        stat.tokensIn += mEval.inputTokens || 0;
                        stat.tokensOut += mEval.outputTokens || 0;
                        stat.successCount += 1;
                        if (mEval.rubricScores?.some(r => r.evidence && r.evidence.trim().length > 0)) {
                            stat.evidenceQuotesCount += 1;
                        }
                    } else {
                        stat.failCount += 1;
                    }
                }
            });
        });
    });

    const modelSummaries = Array.from(modelStats.values()).map(stat => {
        const count = stat.totalScores.length;
        const avgScore = count > 0 ? Number((stat.totalScores.reduce((a, b) => a + b, 0) / count).toFixed(2)) : 0;
        const avgLatency = stat.latencies.length > 0 ? Math.round(stat.latencies.reduce((a, b) => a + b, 0) / stat.latencies.length) : 0;
        return {
            provider: stat.provider,
            model: stat.model,
            label: stat.label,
            evaluatedQuestionsCount: count,
            averageScore: avgScore,
            averageLatencyMs: avgLatency,
            totalTokens: stat.tokensIn + stat.tokensOut,
            evidenceQualityScore: count > 0 ? Math.round((stat.evidenceQuotesCount / count) * 100) : 100,
            successRate: (stat.successCount + stat.failCount) > 0
                ? Number(((stat.successCount / (stat.successCount + stat.failCount)) * 100).toFixed(1))
                : 100,
        };
    });

    const sortedBySpeed = [...modelSummaries].filter(m => m.evaluatedQuestionsCount > 0).sort((a, b) => a.averageLatencyMs - b.averageLatencyMs);
    const sortedByScore = [...modelSummaries].filter(m => m.evaluatedQuestionsCount > 0).sort((a, b) => b.averageScore - a.averageScore);
    const sortedByQuality = [...modelSummaries].filter(m => m.evaluatedQuestionsCount > 0).sort((a, b) => b.evidenceQualityScore - a.evidenceQualityScore);

    const aggregateInsights = {
        totalStudentsSubmitted: attempts.length,
        completedGradingCount: attempts.filter(a => a.gradingStatus === 'completed').length,
        modelSummaries,
        fastestModel: sortedBySpeed[0] || null,
        highestScoringModel: sortedByScore[0] || null,
        highestQualityModel: sortedByQuality[0] || null,
    };

    res.json({
        session,
        attempts,
        aggregateInsights,
    });
});

// PATCH /api/grading/test-sessions/:sessionId/end
const endTestSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await TestExamSession.findById(sessionId);
    if (!session) {
        res.status(404);
        throw new Error('ไม่พบห้องสอบจำลองนี้');
    }

    if (String(session.createdBy) !== String(req.user._id)) {
        res.status(403);
        throw new Error('คุณไม่มีสิทธิ์ปิดห้องสอบนี้');
    }

    session.status = session.status === 'active' ? 'ended' : 'active';
    await session.save();

    res.json({ message: `ห้องสอบ${session.status === 'active' ? 'เปิด' : 'ปิด'}แล้ว`, session });
});

module.exports = {
    createTestExam,
    listTeacherTestExams,
    getTestExam,
    updateTestExam,
    deleteTestExam,
    createTestSession,
    listTeacherTestSessions,
    getTestSession,
    submitTestExam,
    getStudentAttemptStatus,
    getTestSessionResults,
    endTestSession,
    processAttemptEvaluations,
};
