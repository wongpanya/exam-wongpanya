require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('../../src/models/examModel');
const ExamAttempt = require('../../src/models/examAttemptModel');
const GradingRun = require('../../src/models/gradingRunModel');
const GradingResult = require('../../src/models/gradingResultModel');
const GradingReviewLog = require('../../src/models/gradingReviewLogModel');
const AIProviderCredential = require('../../src/models/aiProviderCredentialModel');
const AITeacherRouting = require('../../src/models/aiTeacherRoutingModel');

const run = async () => {
    if (!process.env.MONGODB_URL) {
        throw new Error('MONGODB_URL is required');
    }

    await mongoose.connect(process.env.MONGODB_URL);

    const examBulk = [];
    const legacyExamIds = [];
    const examOwners = [];
    const cursor = Exam.collection.find({}, { projection: { questions: 1, createdBy: 1 } });
    for await (const exam of cursor) {
        if (exam.createdBy) examOwners.push({ examId: exam._id, ownerId: exam.createdBy });
        let changed = false;
        let containsAiQuestion = false;
        const questions = (exam.questions || []).map((question) => {
            const copy = { ...question };
            if (!copy.gradingMode) {
                copy.gradingMode = 'exact';
                changed = true;
            }
            if (!copy.aiGrading) {
                copy.aiGrading = {
                    groundTruths: [],
                    rubricCriteria: [],
                    keyConcepts: [],
                    language: 'th',
                    providerPreference: 'system',
                    modelPreference: '',
                };
                changed = true;
            }
            if (copy.aiGrading.modelPreference === undefined) {
                copy.aiGrading.modelPreference = '';
                changed = true;
            }
            if (copy.type === 'text' && copy.gradingMode === 'ai') containsAiQuestion = true;
            return copy;
        });

        if (!containsAiQuestion) legacyExamIds.push(exam._id);
        if (changed) {
            examBulk.push({
                updateOne: {
                    filter: { _id: exam._id },
                    update: { $set: { questions } },
                },
            });
        }
    }

    if (examBulk.length > 0) await Exam.collection.bulkWrite(examBulk, { ordered: false });

    const attemptResult = legacyExamIds.length > 0
        ? await ExamAttempt.collection.updateMany({
            exam: { $in: legacyExamIds },
            finalScore: { $exists: false },
        }, [{
            $set: {
                objectiveScore: { $ifNull: ['$score', 0] },
                finalScore: '$score',
                gradingStatus: 'not-required',
            },
        }])
        : { modifiedCount: 0 };

    let gradingResultsUpdated = 0;
    for (const { examId, ownerId } of examOwners) {
        const result = await GradingResult.collection.updateMany(
            { exam: examId, credentialOwner: { $exists: false } },
            { $set: { credentialOwner: ownerId } }
        );
        gradingResultsUpdated += result.modifiedCount || 0;
    }

    await Promise.all([
        GradingRun.createIndexes(),
        GradingResult.createIndexes(),
        GradingReviewLog.createIndexes(),
        AIProviderCredential.createIndexes(),
        AITeacherRouting.createIndexes(),
        ExamAttempt.createIndexes(),
    ]);

    console.log(JSON.stringify({
        migration: '001-ai-grading',
        examsUpdated: examBulk.length,
        legacyAttemptsUpdated: attemptResult.modifiedCount || 0,
        gradingResultsUpdated,
        status: 'completed',
    }));
};

run()
    .catch((error) => {
        console.error(JSON.stringify({ migration: '001-ai-grading', status: 'failed', message: error.message }));
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
