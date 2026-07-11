const GradingRun = require('../../models/gradingRunModel');
const aiConfig = require('../../config/aiConfig');

const truncateRaw = (value) => {
    if (!aiConfig.storeRawResponses || !value) return null;
    return String(value).slice(0, aiConfig.maxRawResponseChars);
};

const createGradingRunLogger = ({ operationId, context }) => async (event) => {
    const key = {
        operationId,
        provider: event.provider,
        attemptNumber: event.attemptNumber,
    };

    const base = {
        gradingResult: context.gradingResult || null,
        attempt: context.attempt || null,
        exam: context.exam || null,
        questionId: context.questionId || '',
        requestedBy: context.requestedBy || null,
        trigger: context.trigger || 'manual',
        model: event.model || '',
        promptVersion: event.promptVersion,
        requestSnapshot: context.requestSnapshot || null,
    };

    if (event.phase === 'started') {
        const run = await GradingRun.findOneAndUpdate(key, {
            $setOnInsert: { ...key, ...base },
            $set: { status: 'processing', startedAt: event.startedAt || new Date() },
        }, { upsert: true, returnDocument: 'after' });
        return run._id;
    }

    const update = {
        ...base,
        status: event.status,
        finishedAt: event.finishedAt || new Date(),
        latencyMs: event.metadata?.latencyMs ?? event.latencyMs ?? null,
        rawResponse: truncateRaw(event.rawResponse),
        parsedResponse: event.parsedResponse || null,
        inputTokens: event.metadata?.inputTokens ?? null,
        outputTokens: event.metadata?.outputTokens ?? null,
        estimatedCost: event.metadata?.estimatedCost ?? null,
        errorCode: event.error?.code || null,
        errorMessage: event.error?.message || null,
    };

    const run = await GradingRun.findOneAndUpdate(key, {
        $setOnInsert: { ...key, startedAt: event.startedAt || new Date() },
        $set: update,
    }, { upsert: true, returnDocument: 'after' });
    return run._id;
};

module.exports = { createGradingRunLogger, truncateRaw };
