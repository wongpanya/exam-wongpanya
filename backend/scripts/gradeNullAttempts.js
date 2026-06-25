const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Exam = require('../src/models/examModel');
const ExamAttempt = require('../src/models/examAttemptModel');

dotenv.config();

async function run() {
    try {
        if (!process.env.MONGODB_URL) {
            console.error('❌ MONGODB_URL is missing in environment variables');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected to Database');

        // Find all attempts that are submitted but score is null
        const attempts = await ExamAttempt.find({
            status: 'submitted',
            score: null
        });

        console.log(`🔍 Found ${attempts.length} attempts with null score.`);

        if (attempts.length === 0) {
            console.log('🎉 No attempts to fix.');
            process.exit(0);
        }

        // Cache exams to avoid N+1 queries
        const examMap = new Map();
        let fixedCount = 0;

        for (const attempt of attempts) {
            let examData = examMap.get(attempt.exam.toString());
            if (!examData) {
                examData = await Exam.findById(attempt.exam);
                if (examData) {
                    examMap.set(attempt.exam.toString(), examData);
                }
            }

            if (!examData) {
                console.warn(`⚠️ Exam ${attempt.exam} not found for attempt ${attempt._id}. Skipping.`);
                continue;
            }

            // Create map of correct answers
            const correctMap = new Map();
            examData.questions.forEach(q => {
                correctMap.set(q.questionId, { correct: q.correctAnswer, points: q.points || 1 });
            });

            let score = 0;
            attempt.answers.forEach(ans => {
                const qInfo = correctMap.get(ans.questionId);
                if (qInfo) {
                    if (String(ans.selectedAnswer) === String(qInfo.correct)) {
                        score += qInfo.points;
                    }
                }
            });

            attempt.score = score;
            await attempt.save();
            fixedCount++;
            console.log(`✅ Graded attempt ${attempt._id} (Exam: ${examData.title}): Score = ${score}`);
        }

        console.log(`🎉 Successfully fixed ${fixedCount} attempts!`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing attempts:', err);
        process.exit(1);
    }
}

run();
