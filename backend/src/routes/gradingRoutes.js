const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { gradingLimiter } = require('../middleware/rateLimiter');
const {
    gradingReviewer,
    loadOwnedAnswer,
    loadOwnedGradingResult,
} = require('../middleware/gradingAuthorization');
const {
    gradeSchema,
    regradeSchema,
    reviewSchema,
    providerKeySchema,
    providerModelSchema,
    primaryProviderSchema,
    benchmarkSchema,
} = require('../schemas/gradingSchemas');
const {
    grade,
    regrade,
    benchmark,
    getGrading,
    getAttemptGrading,
    review,
    getHistory,
    getProviders,
    getProviderSettings,
    saveProviderKey,
    refreshProviderModelList,
    updateProviderModel,
    updatePrimaryProvider,
    removeProviderKey,
} = require('../controllers/gradingController');

const {
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
    deleteTestSession,
} = require('../controllers/testExamSessionController');

// Student & general authenticated test session endpoints
router.get('/test-sessions/:sessionId', protect, getTestSession);
router.get('/test-sessions/:sessionId/attempts/:attemptId', protect, getStudentAttemptStatus);
router.post('/test-sessions/:sessionId/submit', protect, gradingLimiter, submitTestExam);

// Teacher-only grading, test exams, and review endpoints
router.use(protect, gradingReviewer);

// Test Exams CRUD
router.post('/test-exams', createTestExam);
router.get('/test-exams', listTeacherTestExams);
router.get('/test-exams/:id', getTestExam);
router.put('/test-exams/:id', updateTestExam);
router.delete('/test-exams/:id', deleteTestExam);

// Test Sessions
router.post('/test-sessions', createTestSession);
router.get('/test-sessions', listTeacherTestSessions);
router.get('/test-sessions/:sessionId/results', getTestSessionResults);
router.patch('/test-sessions/:sessionId/end', endTestSession);
router.delete('/test-sessions/:sessionId', deleteTestSession);

router.get('/providers', getProviders);
router.get('/provider-settings', getProviderSettings);
router.patch('/provider-settings/primary', gradingLimiter, validate(primaryProviderSchema), updatePrimaryProvider);
router.put('/provider-settings/:provider/key', gradingLimiter, validate(providerKeySchema), saveProviderKey);
router.post('/provider-settings/:provider/refresh-models', gradingLimiter, refreshProviderModelList);
router.patch('/provider-settings/:provider/model', gradingLimiter, validate(providerModelSchema), updateProviderModel);
router.delete('/provider-settings/:provider/key', gradingLimiter, removeProviderKey);
router.post('/grade', gradingLimiter, validate(gradeSchema), grade);
router.post('/benchmark', gradingLimiter, validate(benchmarkSchema), benchmark);

const answerMiddlewares = [loadOwnedAnswer, loadOwnedGradingResult];
router.get('/:attemptId/all', getAttemptGrading);
router.get('/:attemptId/questions/:questionId', ...answerMiddlewares, getGrading);
router.get('/:attemptId/questions/:questionId/history', ...answerMiddlewares, getHistory);
router.post('/:attemptId/questions/:questionId/regrade', gradingLimiter, validate(regradeSchema), ...answerMiddlewares, regrade);
router.patch('/:attemptId/questions/:questionId/review', gradingLimiter, validate(reviewSchema), ...answerMiddlewares, review);

module.exports = router;
