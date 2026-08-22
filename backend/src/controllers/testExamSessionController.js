const asyncHandler = require('express-async-handler');
const TestExamSession = require('../models/testExamSessionModel');
const TestExamAttempt = require('../models/testExamAttemptModel');
const { benchmarkAdHoc } = require('../services/grading/gradingService');
const { scoreExactAnswer, isAiQuestion } = require('../services/grading/attemptScoreService');

// Generate unique 6-digit short code
const generateShortCode = async () => {
    for (let i = 0; i < 10; i++) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await TestExamSession.findOne({ shortCode: code, status: 'active' });
        if (!existing) return code;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/grading/test-sessions
const createTestSession = asyncHandler(async (req, res) => {
    const { title, description, durationMin, questions, modelsToCompare } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        res.status(400);
        throw new Error('กรุณาระบุโจทย์ข้อสอบอย่างน้อย 1 ข้อ');
    }

    if (!modelsToCompare || !Array.isArray(modelsToCompare) || modelsToCompare.length === 0) {
        res.status(400);
        throw new Error('กรุณาเลือกโมเดล AI อย่างน้อย 1 โมเดล');
    }

    const shortCode = await generateShortCode();

    const session = await TestExamSession.create({
        title: title || 'ห้องสอบจำลองทดสอบโมเดล AI',
        description: description || '',
        durationMin: Number(durationMin) || 30,
        questions,
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
    const sessions = await TestExamSession.find({ createdBy: req.user._id })
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

    // Sanitize questions for student view (do not expose ground truths/rubrics to test taker)
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
        title: session.title,
        description: session.description,
        durationMin: session.durationMin,
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

    if (session.status !== 'active') {
        res.status(400);
        throw new Error('ห้องสอบจำลองนี้ถูกปิดแล้ว');
    }

    // Check if student already submitted
    const existingAttempt = await TestExamAttempt.findOne({ session: session._id, student: req.user._id });
    if (existingAttempt) {
        res.status(409);
        throw new Error('คุณได้ส่งคำตอบสำหรับห้องสอบนี้ไปแล้ว');
    }

    const answersMap = new Map((answers || []).map(a => [a.questionId, a.selectedAnswer || '']));
    const evaluations = [];

    // Evaluate each question with all models configured in the session
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

    const studentInfo = {
        firstName: req.user.firstName || '',
        lastName: req.user.lastName || '',
        email: req.user.email || '',
    };

    const attempt = await TestExamAttempt.create({
        session: session._id,
        student: req.user._id,
        studentInfo,
        answers: (answers || []).map(a => ({ questionId: a.questionId, selectedAnswer: a.selectedAnswer || '' })),
        evaluations,
        submittedAt: new Date(),
    });

    // Update submittedCount
    session.submittedCount += 1;
    await session.save();

    res.status(201).json({
        message: 'ส่งคำตอบเรียบร้อยแล้ว',
        attemptId: attempt._id,
        evaluations,
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

    // Compute Multi-Student Aggregate Model Comparison
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
            successRate: (stat.successCount + stat.failCount) > 0
                ? Number(((stat.successCount / (stat.successCount + stat.failCount)) * 100).toFixed(1))
                : 100,
        };
    });

    // Determine aggregate best models
    const sortedBySpeed = [...modelSummaries].sort((a, b) => a.averageLatencyMs - b.averageLatencyMs);
    const sortedByScore = [...modelSummaries].sort((a, b) => b.averageScore - a.averageScore);

    const aggregateInsights = {
        totalStudentsSubmitted: attempts.length,
        modelSummaries,
        fastestModel: sortedBySpeed[0] || null,
        highestScoringModel: sortedByScore[0] || null,
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

    session.status = 'ended';
    await session.save();

    res.json({ message: 'ปิดห้องสอบเรียบร้อยแล้ว', session });
});

module.exports = {
    createTestSession,
    listTeacherTestSessions,
    getTestSession,
    submitTestExam,
    getTestSessionResults,
    endTestSession,
};
