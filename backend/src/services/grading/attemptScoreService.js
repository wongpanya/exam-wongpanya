const ExamAttempt = require('../../models/examAttemptModel');
const Exam = require('../../models/examModel');
const GradingResult = require('../../models/gradingResultModel');

const isAiQuestion = question => question.type === 'text' && question.gradingMode === 'ai';

const getAnswer = (attempt, questionId) => attempt.answers.find(answer => answer.questionId === questionId);

const scoreExactAnswer = (question, answer) => {
    if (!answer) return 0;
    return String(answer.selectedAnswer) === String(question.correctAnswer) ? (question.points || 1) : 0;
};

const recalculateAttemptScores = async (attemptId, { session = null } = {}) => {
    const queryOptions = session ? { session } : {};
    const attempt = await ExamAttempt.findById(attemptId, null, queryOptions);
    if (!attempt) return null;
    const exam = await Exam.findById(attempt.exam, null, queryOptions);
    if (!exam) return null;

    const aiQuestions = exam.questions.filter(isAiQuestion);
    let objectiveScore = 0;
    for (const question of exam.questions) {
        if (!isAiQuestion(question)) {
            objectiveScore += scoreExactAnswer(question, getAnswer(attempt, question.questionId));
        }
    }

    attempt.objectiveScore = objectiveScore;
    if (aiQuestions.length === 0) {
        attempt.aiScore = null;
        attempt.teacherScore = null;
        attempt.finalScore = objectiveScore;
        attempt.score = objectiveScore;
        attempt.gradingStatus = 'not-required';
        await attempt.save(queryOptions);
        return attempt;
    }

    const results = await GradingResult.find({
        attempt: attempt._id,
        questionId: { $in: aiQuestions.map(question => question.questionId) },
    }, null, queryOptions);
    const resultMap = new Map(results.map(result => [result.questionId, result]));

    const allAiScoresAvailable = aiQuestions.every(question => Number.isFinite(resultMap.get(question.questionId)?.aiScore));
    const allFinalScoresAvailable = aiQuestions.every(question => Number.isFinite(resultMap.get(question.questionId)?.finalScore));
    const hasTeacherScore = aiQuestions.some(question => Number.isFinite(resultMap.get(question.questionId)?.teacherScore));

    attempt.aiScore = allAiScoresAvailable
        ? objectiveScore + aiQuestions.reduce((sum, question) => sum + resultMap.get(question.questionId).aiScore, 0)
        : null;
    attempt.teacherScore = hasTeacherScore && allFinalScoresAvailable
        ? objectiveScore + aiQuestions.reduce((sum, question) => sum + resultMap.get(question.questionId).finalScore, 0)
        : null;
    attempt.finalScore = allFinalScoresAvailable
        ? objectiveScore + aiQuestions.reduce((sum, question) => sum + resultMap.get(question.questionId).finalScore, 0)
        : null;
    attempt.score = attempt.finalScore;

    const statuses = aiQuestions.map(question => resultMap.get(question.questionId)?.status || 'pending');
    if (statuses.includes('failed')) attempt.gradingStatus = 'failed';
    else if (statuses.includes('processing')) attempt.gradingStatus = 'processing';
    else if (statuses.includes('pending')) attempt.gradingStatus = 'pending';
    else if (statuses.includes('needs-review')) attempt.gradingStatus = 'needs-review';
    else attempt.gradingStatus = 'completed';

    await attempt.save(queryOptions);
    return attempt;
};

module.exports = { isAiQuestion, getAnswer, scoreExactAnswer, recalculateAttemptScores };
