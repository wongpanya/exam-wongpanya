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

router.use(protect, gradingReviewer);

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
