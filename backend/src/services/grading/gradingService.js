const { randomUUID } = require('crypto');
const aiConfig = require('../../config/aiConfig');
const ExamAttempt = require('../../models/examAttemptModel');
const Exam = require('../../models/examModel');
const GradingResult = require('../../models/gradingResultModel');
const GradingRun = require('../../models/gradingRunModel');
const GradingReviewLog = require('../../models/gradingReviewLogModel');
const AIRouter = require('./aiRouter');
const { createProviderRegistry } = require('./providerRegistry');
const { createGradingRunLogger } = require('./gradingRunLogger');
const { validateGradeRequest } = require('./gradeValidator');
const { evaluatePreGradeRules } = require('./rulesEngine');
const { PROMPT_VERSION } = require('./promptBuilder');
const { toSafeError, GradingError } = require('./errors');
const { isAiQuestion, getAnswer, recalculateAttemptScores } = require('./attemptScoreService');
const withTransaction = require('../../utils/withTransaction');
const { getTeacherProviderCredentials } = require('./teacherCredentialService');

const sessionOptions = session => session ? { session } : {};
const routingConfigFor = (credentials) => ({
    ...aiConfig,
    primaryProvider: credentials.routing.primaryProvider,
    fallbackProviders: credentials.routing.fallbackProviders,
});

const buildGradeRequest = (question, studentAnswer) => validateGradeRequest({
    question: question.prompt,
    groundTruths: question.aiGrading.groundTruths,
    studentAnswer: String(studentAnswer || ''),
    rubric: question.aiGrading.rubricCriteria.map(item => ({
        id: item.rubricId,
        title: item.title,
        description: item.description,
        maxScore: item.maxScore,
    })),
    keyConcepts: question.aiGrading.keyConcepts || [],
    maxScore: question.points,
    language: question.aiGrading.language || 'th',
});

const prepareAttemptGrading = async (attemptId, { requestedBy = null, trigger = 'automatic' } = {}) => {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) throw new GradingError('Attempt not found', { code: 'ATTEMPT_NOT_FOUND', statusCode: 404 });
    const exam = await Exam.findById(attempt.exam);
    if (!exam) throw new GradingError('Exam not found', { code: 'EXAM_NOT_FOUND', statusCode: 404 });

    const aiQuestions = exam.questions.filter(isAiQuestion);
    const resultIds = [];
    for (const question of aiQuestions) {
        const answer = getAnswer(attempt, question.questionId);
        const requestSnapshot = buildGradeRequest(question, answer?.selectedAnswer || '');
        const result = await GradingResult.findOneAndUpdate(
            { attempt: attempt._id, questionId: question.questionId },
            {
                $set: { credentialOwner: exam.createdBy },
                $setOnInsert: {
                    attempt: attempt._id,
                    exam: exam._id,
                    questionId: question.questionId,
                    maxScore: question.points,
                    requestSnapshot,
                    providerPreference: question.aiGrading.providerPreference || 'system',
                    modelPreference: question.aiGrading.modelPreference || '',
                    requestedBy,
                    trigger,
                    status: 'pending',
                },
            },
            { upsert: true, returnDocument: 'after' }
        );
        resultIds.push(result._id);
    }

    await recalculateAttemptScores(attempt._id);
    return resultIds;
};

const claimGradingResult = async (resultId) => {
    const now = new Date();
    const lockId = randomUUID();
    const lockExpiresAt = new Date(now.getTime() + aiConfig.workerLockMs);
    return GradingResult.findOneAndUpdate({
        _id: resultId,
        $or: [
            { status: 'pending' },
            { status: 'processing', lockExpiresAt: { $lt: now } },
        ],
    }, {
        $set: { status: 'processing', lockId, lockExpiresAt },
    }, { returnDocument: 'after' }).select('+requestSnapshot');
};

const snapshotScores = result => ({
    aiScore: result.aiScore ?? null,
    teacherScore: result.teacherScore ?? null,
    finalScore: result.finalScore ?? null,
    status: result.status,
});

const persistSuccessfulGrade = async (claimed, routed, { operationId, trigger, requestedBy }) => withTransaction(async (session) => {
    const options = sessionOptions(session);
    const current = await GradingResult.findOne({ _id: claimed._id, lockId: claimed.lockId }, null, options);
    if (!current) throw new GradingError('The grading lock expired', { code: 'GRADING_LOCK_EXPIRED', statusCode: 409 });

    const before = snapshotScores(current);
    const result = routed.result;
    const preservedTeacherScore = Number.isFinite(current.teacherScore) ? current.teacherScore : null;
    const mustReviewTeacherOverride = preservedTeacherScore !== null && trigger === 'regrade';
    const reviewReason = [
        result.reviewReason,
        mustReviewTeacherOverride ? 'A teacher score is preserved until the new AI result is reviewed.' : '',
    ].filter(Boolean).join(' ');

    current.selectedRun = routed.runReference || null;
    current.aiScore = result.totalScore;
    current.finalScore = preservedTeacherScore ?? result.totalScore;
    current.maxScore = result.maxScore;
    current.criteria = result.criteria;
    current.detectedConcepts = result.detectedConcepts;
    current.missingConcepts = result.missingConcepts;
    current.confidence = result.confidence;
    current.needsHumanReview = result.needsHumanReview || mustReviewTeacherOverride;
    current.reviewReason = reviewReason;
    current.provider = result.metadata.provider;
    current.model = result.metadata.model;
    current.latencyMs = result.metadata.latencyMs;
    current.inputTokens = result.metadata.inputTokens ?? null;
    current.outputTokens = result.metadata.outputTokens ?? null;
    current.estimatedCost = result.metadata.estimatedCost ?? null;
    current.rulesDecisions = [
        ...routed.rulesDecisions,
        ...(mustReviewTeacherOverride ? [{
            rule: 'teacher-score-preserved',
            action: 'require-human-review',
            reason: 'The previous teacher score was not overwritten by regrading.',
        }] : []),
    ];
    current.status = current.needsHumanReview ? 'needs-review' : 'completed';
    current.lastError = { code: null, message: null, at: null };
    current.operationId = operationId;
    current.lockId = null;
    current.lockExpiresAt = null;
    current.gradedAt = new Date();
    await current.save(options);

    if (routed.runReference) {
        await GradingRun.updateOne({ _id: routed.runReference }, { $set: { gradingResult: current._id } }, options);
    }

    if (trigger === 'regrade' && requestedBy) {
        await GradingReviewLog.create([{
            gradingResult: current._id,
            gradingRun: routed.runReference || null,
            attempt: current.attempt,
            exam: current.exam,
            questionId: current.questionId,
            action: 'regrade-completed',
            before,
            after: snapshotScores(current),
            reason: 'AI regrade completed.',
            actor: requestedBy,
        }], options);
    }

    await recalculateAttemptScores(current.attempt, { session });
    return current;
});

const persistFailedGrade = async (claimed, error) => {
    const safeError = toSafeError(error);
    const hasPreviousResult = Boolean(claimed.selectedRun && Number.isFinite(claimed.aiScore));
    const status = hasPreviousResult ? 'needs-review' : 'failed';
    const reviewReason = hasPreviousResult
        ? [claimed.reviewReason, `The latest regrade failed: ${safeError.message}`].filter(Boolean).join(' ')
        : claimed.reviewReason;

    await GradingResult.updateOne({ _id: claimed._id, lockId: claimed.lockId }, {
        $set: {
            status,
            needsHumanReview: hasPreviousResult || claimed.needsHumanReview,
            reviewReason,
            lastError: { ...safeError, at: new Date() },
            lockId: null,
            lockExpiresAt: null,
        },
    });
    await recalculateAttemptScores(claimed.attempt);
};

const processClaimedResult = async (claimed) => {
    const operationId = randomUUID();
    const request = validateGradeRequest(claimed.requestSnapshot);
    const context = {
        gradingResult: claimed._id,
        attempt: claimed.attempt,
        exam: claimed.exam,
        questionId: claimed.questionId,
        requestedBy: claimed.requestedBy,
        trigger: claimed.trigger,
        requestSnapshot: request,
    };

    try {
        const preRule = evaluatePreGradeRules(request);
        let routed;
        if (preRule) {
            const metadata = {
                provider: 'rules-engine',
                model: 'empty-answer-v1',
                latencyMs: 0,
            };
            const run = await GradingRun.create({
                operationId,
                gradingResult: claimed._id,
                attempt: claimed.attempt,
                exam: claimed.exam,
                questionId: claimed.questionId,
                requestedBy: claimed.requestedBy,
                trigger: 'rules-engine',
                provider: metadata.provider,
                model: metadata.model,
                status: 'succeeded',
                attemptNumber: 1,
                promptVersion: PROMPT_VERSION,
                requestSnapshot: request,
                parsedResponse: preRule.result,
                latencyMs: 0,
                startedAt: new Date(),
                finishedAt: new Date(),
            });
            routed = {
                result: { ...preRule.result, metadata },
                rulesDecisions: preRule.decisions,
                runReference: run._id,
            };
        } else {
            const logger = createGradingRunLogger({ operationId, context });
            const credentials = await getTeacherProviderCredentials(claimed.credentialOwner, {
                preferredProvider: claimed.providerPreference,
                preferredModel: claimed.modelPreference,
            });
            const routingConfig = routingConfigFor(credentials);
            const router = new AIRouter({
                providers: createProviderRegistry({ credentials, config: routingConfig }),
                config: routingConfig,
                onAttempt: logger,
            });
            const previousResult = Number.isFinite(claimed.aiScore) ? { totalScore: claimed.aiScore } : null;
            routed = await router.grade(request, {
                preferredProvider: claimed.providerPreference,
                previousResult,
                context,
            });
        }

        return await persistSuccessfulGrade(claimed, routed, {
            operationId,
            trigger: claimed.trigger,
            requestedBy: claimed.requestedBy,
        });
    } catch (error) {
        await persistFailedGrade(claimed, error);
        throw error;
    }
};

const processGradingResult = async (resultId) => {
    const claimed = await claimGradingResult(resultId);
    if (!claimed) {
        throw new GradingError('This answer is already being graded or is not pending', {
            code: 'DUPLICATE_GRADING',
            statusCode: 409,
        });
    }
    return processClaimedResult(claimed);
};

const queueRegrade = async (resultId, { requestedBy, providerPreference, modelPreference } = {}) => withTransaction(async (session) => {
    const options = sessionOptions(session);
    const result = await GradingResult.findById(resultId, null, options);
    if (!result) throw new GradingError('Grading result not found', { code: 'RESULT_NOT_FOUND', statusCode: 404 });
    if (result.status === 'pending' || result.status === 'processing') {
        throw new GradingError('This answer is already queued for grading', { code: 'DUPLICATE_GRADING', statusCode: 409 });
    }
    if (result.regradeCount >= aiConfig.maxRegradesPerAnswer) {
        throw new GradingError('The maximum number of regrades has been reached', { code: 'REGRADE_LIMIT', statusCode: 429 });
    }

    const before = snapshotScores(result);
    result.regradeCount += 1;
    result.status = 'pending';
    result.requestedBy = requestedBy;
    result.trigger = 'regrade';
    result.providerPreference = providerPreference || result.providerPreference || 'system';
    result.modelPreference = modelPreference !== undefined ? modelPreference : result.modelPreference;
    result.lockId = null;
    result.lockExpiresAt = null;
    await result.save(options);

    await GradingReviewLog.create([{
        gradingResult: result._id,
        gradingRun: result.selectedRun,
        attempt: result.attempt,
        exam: result.exam,
        questionId: result.questionId,
        action: 'regrade-requested',
        before,
        after: snapshotScores(result),
        reason: 'A reviewer requested a new AI grading run.',
        actor: requestedBy,
    }], options);
    await recalculateAttemptScores(result.attempt, { session });
    return result;
});

const gradeAdHoc = async (rawRequest, {
    requestedBy = null,
    preferredProvider = 'system',
    preferredModel = '',
} = {}) => {
    const request = validateGradeRequest(rawRequest);
    if (request.studentAnswer.length > aiConfig.maxAnswerChars) {
        throw new GradingError(`Student answer exceeds ${aiConfig.maxAnswerChars} characters`, {
            code: 'ANSWER_TOO_LONG',
            statusCode: 400,
        });
    }

    const preRule = evaluatePreGradeRules(request);
    if (preRule) {
        return {
            ...preRule.result,
            metadata: { provider: 'rules-engine', model: 'empty-answer-v1', latencyMs: 0 },
            rulesDecisions: preRule.decisions,
        };
    }

    const operationId = randomUUID();
    const context = { requestedBy, trigger: 'test', requestSnapshot: request };
    const logger = createGradingRunLogger({ operationId, context });
    const credentials = await getTeacherProviderCredentials(requestedBy, {
        preferredProvider,
        preferredModel,
    });
    const routingConfig = routingConfigFor(credentials);
    const router = new AIRouter({
        providers: createProviderRegistry({ credentials, config: routingConfig }),
        config: routingConfig,
        onAttempt: logger,
    });
    const routed = await router.grade(request, { preferredProvider, context });
    return { ...routed.result, rulesDecisions: routed.rulesDecisions };
};

const computeBenchmarkSummary = (results, request = {}) => {
    const successful = results.filter(r => r.status === 'succeeded' && r.result);
    if (successful.length === 0) {
        return {
            totalEvaluated: results.length,
            successfulCount: 0,
            failedCount: results.length,
            averageScore: 0,
            scoreRange: { min: 0, max: 0, spread: 0 },
            recommendations: null,
            insights: ['ทุกโมเดลที่เลือกทดสอบเกิดข้อผิดพลาดในการประมวลผล'],
        };
    }

    const scores = successful.map(r => Number(r.result.totalScore) || 0);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const sumScores = scores.reduce((acc, s) => acc + s, 0);
    const averageScore = Number((sumScores / successful.length).toFixed(2));

    const fastest = successful.reduce((best, curr) => {
        const currLat = curr.latencyMs || curr.result.metadata?.latencyMs || Infinity;
        const bestLat = best.latencyMs || best.result.metadata?.latencyMs || Infinity;
        return currLat < bestLat ? curr : best;
    }, successful[0]);

    const highestEvidence = successful.reduce((best, curr) => {
        const currEvidenceCount = (curr.result.rubricScores || []).filter(c => c.evidence && c.evidence.trim()).length;
        const bestEvidenceCount = (best.result.rubricScores || []).filter(c => c.evidence && c.evidence.trim()).length;
        return currEvidenceCount > bestEvidenceCount ? curr : best;
    }, successful[0]);

    const balanced = highestEvidence || fastest || successful[0];

    const insights = [];
    if (maxScore === minScore) {
        insights.push(`ทุกโมเดลให้คะแนนตรงกันอย่างเอกฉันท์ที่ ${averageScore} คะแนน`);
    } else {
        insights.push(`คะแนนระหว่างโมเดลต่างกัน ${(maxScore - minScore).toFixed(1)} คะแนน (ต่ำสุด: ${minScore}, สูงสุด: ${maxScore})`);
    }
    insights.push(`โมเดลที่เร็วที่สุดคือ ${fastest.label || fastest.model} (${fastest.latencyMs} ms)`);

    return {
        totalEvaluated: results.length,
        successfulCount: successful.length,
        failedCount: results.length - successful.length,
        averageScore,
        scoreRange: { min: minScore, max: maxScore, spread: Number((maxScore - minScore).toFixed(2)) },
        recommendations: {
            bestValue: {
                provider: fastest.provider,
                model: fastest.model,
                label: fastest.label,
                reason: `ประมวลผลเร็วที่สุด (${fastest.latencyMs} ms) เหมาะสำหรับการตรวจจำนวนมาก`,
            },
            highestQuality: {
                provider: highestEvidence.provider,
                model: highestEvidence.model,
                label: highestEvidence.label,
                reason: 'ยกหลักฐาน (Evidence) และให้เหตุผลการประเมินตามเกณฑ์ Rubric ละเอียดที่สุด',
            },
            balanced: {
                provider: balanced.provider,
                model: balanced.model,
                label: balanced.label,
                reason: 'ให้ความสมดุลทั้งความแม่นยำในการให้คะแนนและระยะเวลาประมวลผล',
            },
        },
        insights,
    };
};

const benchmarkAdHoc = async (rawRequest, {
    requestedBy = null,
    models = [],
} = {}) => {
    const request = validateGradeRequest(rawRequest);
    if (request.studentAnswer.length > aiConfig.maxAnswerChars) {
        throw new GradingError(`Student answer exceeds ${aiConfig.maxAnswerChars} characters`, {
            code: 'ANSWER_TOO_LONG',
            statusCode: 400,
        });
    }

    const preRule = evaluatePreGradeRules(request);
    if (preRule) {
        const results = models.map(target => ({
            provider: target.provider,
            model: target.model || 'empty-answer-v1',
            label: target.label || `${target.provider} (${target.model || 'default'})`,
            status: 'succeeded',
            latencyMs: 0,
            result: {
                ...preRule.result,
                metadata: { provider: 'rules-engine', model: 'empty-answer-v1', latencyMs: 0 },
                rulesDecisions: preRule.decisions,
            },
        }));
        return { request, results, summary: computeBenchmarkSummary(results, request) };
    }

    const promises = models.map(async (target) => {
        const start = Date.now();
        const operationId = randomUUID();
        const context = { requestedBy, trigger: 'benchmark', target, requestSnapshot: request };
        const logger = createGradingRunLogger({ operationId, context });

        try {
            const credentials = await getTeacherProviderCredentials(requestedBy, {
                preferredProvider: target.provider,
                preferredModel: target.model,
            });
            const routingConfig = routingConfigFor(credentials);
            const router = new AIRouter({
                providers: createProviderRegistry({ credentials, config: routingConfig }),
                config: routingConfig,
                onAttempt: logger,
            });

            const routed = await router.grade(request, {
                preferredProvider: target.provider,
                context,
            });

            const latencyMs = Date.now() - start;
            return {
                provider: target.provider,
                model: target.model || routed.result.metadata?.model || '',
                label: target.label || `${target.provider} (${target.model || 'default'})`,
                status: 'succeeded',
                latencyMs,
                result: {
                    ...routed.result,
                    metadata: {
                        ...routed.result.metadata,
                        latencyMs,
                    },
                    rulesDecisions: routed.rulesDecisions,
                },
            };
        } catch (error) {
            const latencyMs = Date.now() - start;
            return {
                provider: target.provider,
                model: target.model || '',
                label: target.label || `${target.provider} (${target.model || 'default'})`,
                status: 'failed',
                latencyMs,
                error: error.message || 'Model execution failed',
            };
        }
    });

    const evaluated = await Promise.all(promises);
    return {
        request,
        results: evaluated,
        summary: computeBenchmarkSummary(evaluated, request),
    };
};

module.exports = {
    buildGradeRequest,
    prepareAttemptGrading,
    claimGradingResult,
    processClaimedResult,
    processGradingResult,
    queueRegrade,
    gradeAdHoc,
    benchmarkAdHoc,
    computeBenchmarkSummary,
    snapshotScores,
};
