const asyncHandler = require('express-async-handler');
const ExamAttempt = require('../models/examAttemptModel');
const Exam = require('../models/examModel');
const GradingResult = require('../models/gradingResultModel');
const GradingRun = require('../models/gradingRunModel');
const GradingReviewLog = require('../models/gradingReviewLogModel');
const withTransaction = require('../utils/withTransaction');
const { canManageExam } = require('../middleware/gradingAuthorization');
const { isAiQuestion, recalculateAttemptScores } = require('../services/grading/attemptScoreService');
const {
    prepareAttemptGrading,
    processGradingResult,
    queueRegrade,
    gradeAdHoc,
    snapshotScores,
} = require('../services/grading/gradingService');
const {
    PROVIDERS,
    listTeacherProviderSettings,
    getTeacherRouting,
    setTeacherPrimaryProvider,
    saveTeacherApiKey,
    refreshTeacherModels,
    selectTeacherModel,
    deleteTeacherCredential,
} = require('../services/grading/teacherCredentialService');

const sessionOptions = session => session ? { session } : {};

const serializeResult = result => result?.toObject ? result.toObject() : result;

const getStoredContext = async ({ attemptId, questionId, user }) => {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
        const error = new Error('Attempt not found');
        error.statusCode = 404;
        throw error;
    }
    const exam = await Exam.findById(attempt.exam);
    if (!exam) {
        const error = new Error('Exam not found');
        error.statusCode = 404;
        throw error;
    }
    if (!canManageExam(user, exam)) {
        const error = new Error('Not authorized to grade this answer');
        error.statusCode = 403;
        throw error;
    }
    const question = exam.questions.find(item => item.questionId === questionId);
    if (!question) {
        const error = new Error('Student answer not found');
        error.statusCode = 404;
        throw error;
    }
    const answer = attempt.answers.find(item => item.questionId === questionId)
        || { questionId, selectedAnswer: '' };
    if (!isAiQuestion(question)) {
        const error = new Error('This question is not configured for AI grading');
        error.statusCode = 400;
        throw error;
    }
    return { attempt, exam, question, answer };
};

// POST /api/grading/grade
const grade = asyncHandler(async (req, res) => {
    if (req.body.request) {
        const result = await gradeAdHoc(req.body.request, {
            requestedBy: req.user._id,
            preferredProvider: req.body.preferredProvider,
            preferredModel: req.body.preferredModel,
        });
        return res.json(result);
    }

    const context = await getStoredContext({ ...req.body, user: req.user });
    if (context.attempt.status !== 'submitted') {
        res.status(400);
        throw new Error('Only submitted answers can be graded');
    }

    await prepareAttemptGrading(context.attempt._id, { requestedBy: req.user._id, trigger: 'manual' });
    const gradingResult = await GradingResult.findOne({
        attempt: context.attempt._id,
        questionId: context.question.questionId,
    });
    if (!gradingResult) {
        res.status(500);
        throw new Error('Could not create grading result');
    }
    if (gradingResult.status !== 'pending') {
        res.status(409);
        throw new Error('This answer has already been graded; use the regrade endpoint');
    }

    const result = await processGradingResult(gradingResult._id);
    res.json(result);
});

// POST /api/grading/:attemptId/questions/:questionId/regrade
const regrade = asyncHandler(async (req, res) => {
    const queued = await queueRegrade(req.gradingResult._id, {
        requestedBy: req.user._id,
        providerPreference: req.body.preferredProvider,
        modelPreference: req.body.preferredModel,
    });
    const result = await processGradingResult(queued._id);
    res.json(result);
});

// GET /api/grading/:attemptId/questions/:questionId
const getGrading = asyncHandler(async (req, res) => {
    const { attempt, exam, question, answer } = req.gradingContext;
    await attempt.populate('student', 'firstName lastName email');
    const result = await GradingResult.findById(req.gradingResult._id)
        .select('+requestSnapshot')
        .populate('selectedRun', 'provider model status attemptNumber promptVersion inputTokens outputTokens estimatedCost latencyMs errorCode errorMessage createdAt finishedAt');
    const resultObject = serializeResult(result);
    const requestSnapshot = resultObject.requestSnapshot;
    delete resultObject.requestSnapshot;
    const auditedQuestion = requestSnapshot ? {
        questionId: question.questionId,
        type: 'text',
        prompt: requestSnapshot.question,
        points: requestSnapshot.maxScore,
        gradingMode: 'ai',
        aiGrading: {
            groundTruths: requestSnapshot.groundTruths,
            rubricCriteria: requestSnapshot.rubric.map(item => ({
                rubricId: item.id,
                title: item.title,
                description: item.description,
                maxScore: item.maxScore,
            })),
            keyConcepts: requestSnapshot.keyConcepts,
            language: requestSnapshot.language,
            providerPreference: result.providerPreference,
            modelPreference: result.modelPreference,
        },
    } : question;

    res.json({
        result: resultObject,
        attempt: {
            _id: attempt._id,
            status: attempt.status,
            gradingStatus: attempt.gradingStatus,
            objectiveScore: attempt.objectiveScore,
            aiScore: attempt.aiScore,
            teacherScore: attempt.teacherScore,
            finalScore: attempt.finalScore,
            totalPoints: attempt.totalPoints,
            student: attempt.student,
        },
        exam: { _id: exam._id, title: exam.title },
        question: auditedQuestion,
        studentAnswer: requestSnapshot?.studentAnswer ?? answer.selectedAnswer,
    });
});

// PATCH /api/grading/:attemptId/questions/:questionId/review
const review = asyncHandler(async (req, res) => {
    const updated = await withTransaction(async (session) => {
        const options = sessionOptions(session);
        const result = await GradingResult.findById(req.gradingResult._id, null, options);
        if (!result) {
            const error = new Error('Grading result not found');
            error.statusCode = 404;
            throw error;
        }
        if (!Number.isFinite(result.aiScore)) {
            const error = new Error('No successful AI score is available to review');
            error.statusCode = 409;
            throw error;
        }

        const before = snapshotScores(result);
        if (req.body.action === 'adjust') {
            if (req.body.score > result.maxScore) {
                const error = new Error('Teacher score cannot exceed the question maximum');
                error.statusCode = 400;
                throw error;
            }
            result.teacherScore = req.body.score;
            result.finalScore = req.body.score;
        } else {
            result.teacherScore = null;
            result.finalScore = result.aiScore;
        }
        result.status = 'reviewed';
        result.needsHumanReview = false;
        result.reviewReason = '';
        result.reviewedAt = new Date();
        result.reviewedBy = req.user._id;
        await result.save(options);

        await GradingReviewLog.create([{
            gradingResult: result._id,
            gradingRun: result.selectedRun,
            attempt: result.attempt,
            exam: result.exam,
            questionId: result.questionId,
            action: req.body.action === 'adjust' ? 'adjusted' : 'confirmed',
            before,
            after: snapshotScores(result),
            reason: req.body.reason || '',
            actor: req.user._id,
        }], options);

        await recalculateAttemptScores(result.attempt, { session });
        return result;
    });

    res.json(updated);
});

// GET /api/grading/:attemptId/questions/:questionId/history
const getHistory = asyncHandler(async (req, res) => {
    const [runs, reviews] = await Promise.all([
        GradingRun.find({
            attempt: req.gradingContext.attempt._id,
            questionId: req.gradingContext.question.questionId,
        })
            .select('-requestSnapshot -rawResponse')
            .sort({ createdAt: -1 }),
        GradingReviewLog.find({ gradingResult: req.gradingResult._id })
            .populate('actor', 'firstName lastName role')
            .sort({ createdAt: -1 }),
    ]);
    res.json({ runs, reviews });
});

const getProviders = asyncHandler(async (req, res) => {
    const settings = await listTeacherProviderSettings(req.user._id);
    const routing = await getTeacherRouting(req.user._id);
    res.json({
        primary: routing.primaryProvider,
        fallbacks: routing.fallbackProviders,
        providers: settings.map(item => ({
            name: item.provider,
            configured: item.configured,
            model: item.selectedModel,
        })),
    });
});

const assertProvider = (provider) => {
    if (!PROVIDERS.includes(provider)) {
        const error = new Error('Unsupported AI provider');
        error.statusCode = 400;
        throw error;
    }
    return provider;
};

const getProviderSettings = asyncHandler(async (req, res) => {
    const settings = await listTeacherProviderSettings(req.user._id);
    const routing = await getTeacherRouting(req.user._id);
    res.json({
        primary: routing.primaryProvider,
        fallbacks: routing.fallbackProviders,
        providers: settings,
    });
});

const updatePrimaryProvider = asyncHandler(async (req, res) => {
    const routing = await setTeacherPrimaryProvider(req.user._id, assertProvider(req.body.provider));
    res.json({ primary: routing.primaryProvider, fallbacks: routing.fallbackProviders });
});

const saveProviderKey = asyncHandler(async (req, res) => {
    const setting = await saveTeacherApiKey(
        req.user._id,
        assertProvider(req.params.provider),
        req.body.apiKey
    );
    res.json(setting);
});

const refreshProviderModelList = asyncHandler(async (req, res) => {
    const setting = await refreshTeacherModels(req.user._id, assertProvider(req.params.provider));
    res.json(setting);
});

const updateProviderModel = asyncHandler(async (req, res) => {
    const setting = await selectTeacherModel(
        req.user._id,
        assertProvider(req.params.provider),
        req.body.model
    );
    res.json(setting);
});

const removeProviderKey = asyncHandler(async (req, res) => {
    await deleteTeacherCredential(req.user._id, assertProvider(req.params.provider));
    res.json({ message: 'Provider API key removed' });
});

module.exports = {
    grade,
    regrade,
    getGrading,
    review,
    getHistory,
    getProviders,
    getProviderSettings,
    updatePrimaryProvider,
    saveProviderKey,
    refreshProviderModelList,
    updateProviderModel,
    removeProviderKey,
};
