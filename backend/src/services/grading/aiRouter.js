const aiConfig = require('../../config/aiConfig');
const { buildPrompt } = require('./promptBuilder');
const { validateGradeRequest, validateGradeCandidate } = require('./gradeValidator');
const { applyPostGradeRules } = require('./rulesEngine');
const { ProviderError, AllProvidersFailedError, toSafeError } = require('./errors');

const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class AIRouter {
    constructor({
        providers,
        config = aiConfig,
        sleep = defaultSleep,
        onAttempt = async () => {},
    }) {
        this.providers = providers;
        this.config = config;
        this.sleep = sleep;
        this.onAttempt = onAttempt;
    }

    getProviderOrder(preferredProvider) {
        const requested = preferredProvider && preferredProvider !== 'system' ? [preferredProvider] : [];
        return Array.from(new Set([
            ...requested,
            this.config.primaryProvider,
            ...this.config.fallbackProviders,
        ])).filter(name => this.providers.has(name));
    }

    async withTimeout(operation) {
        const controller = new AbortController();
        let timer;
        const timeout = new Promise((resolve, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(new ProviderError('Provider request timed out', {
                    code: 'TIMEOUT',
                    retriable: true,
                    statusCode: 504,
                }));
            }, this.config.timeoutMs);
        });

        try {
            return await Promise.race([operation(controller.signal), timeout]);
        } finally {
            clearTimeout(timer);
        }
    }

    async grade(rawRequest, { preferredProvider = 'system', previousResult = null, context = {} } = {}) {
        const request = validateGradeRequest(rawRequest);
        const prompt = buildPrompt(request);
        const attemptHistory = [];

        for (const providerName of this.getProviderOrder(preferredProvider)) {
            const provider = this.providers.get(providerName);
            let healthy = false;
            try {
                healthy = await this.withTimeout(signal => provider.healthCheck({ signal }));
            } catch (error) {
                healthy = false;
            }

            if (!healthy) {
                const unavailable = {
                    provider: providerName,
                    model: provider.model || '',
                    attemptNumber: 0,
                    status: 'unavailable',
                    error: { code: 'PROVIDER_UNAVAILABLE', message: 'Provider is not configured or unhealthy' },
                };
                attemptHistory.push(unavailable);
                await this.onAttempt({ ...unavailable, phase: 'finished', context, promptVersion: prompt.version });
                continue;
            }

            for (let retry = 0; retry <= this.config.maxRetries; retry += 1) {
                const attemptNumber = retry + 1;
                const startedAt = Date.now();
                const attemptBase = {
                    provider: providerName,
                    model: provider.model || '',
                    attemptNumber,
                    promptVersion: prompt.version,
                    context,
                };
                await this.onAttempt({ ...attemptBase, phase: 'started', status: 'processing', startedAt });

                try {
                    const providerResponse = await this.withTimeout(signal => provider.grade(request, { prompt, signal }));
                    const validated = validateGradeCandidate(providerResponse.candidate, request);
                    const ruled = applyPostGradeRules(validated, request, { previousResult, config: this.config });
                    const metadata = {
                        provider: providerName,
                        model: providerResponse.model || provider.model,
                        latencyMs: providerResponse.latencyMs ?? (Date.now() - startedAt),
                    };
                    if (providerResponse.inputTokens !== undefined) metadata.inputTokens = providerResponse.inputTokens;
                    if (providerResponse.outputTokens !== undefined) metadata.outputTokens = providerResponse.outputTokens;
                    if (providerResponse.estimatedCost !== undefined) metadata.estimatedCost = providerResponse.estimatedCost;

                    const finished = {
                        ...attemptBase,
                        phase: 'finished',
                        status: 'succeeded',
                        finishedAt: Date.now(),
                        rawResponse: providerResponse.rawResponse,
                        parsedResponse: ruled.result,
                        metadata,
                        rulesDecisions: ruled.decisions,
                    };
                    attemptHistory.push(finished);
                    const runReference = await this.onAttempt(finished);

                    return {
                        result: { ...ruled.result, metadata },
                        rulesDecisions: ruled.decisions,
                        runReference,
                        attempts: attemptHistory,
                    };
                } catch (error) {
                    const safeError = toSafeError(error);
                    const failed = {
                        ...attemptBase,
                        phase: 'finished',
                        status: 'failed',
                        finishedAt: Date.now(),
                        latencyMs: Date.now() - startedAt,
                        error: safeError,
                    };
                    attemptHistory.push(failed);
                    await this.onAttempt(failed);

                    if (!error?.retriable || retry >= this.config.maxRetries) break;
                    const delay = this.config.retryBaseDelayMs * (2 ** retry);
                    if (delay > 0) await this.sleep(delay);
                }
            }
        }

        throw new AllProvidersFailedError(attemptHistory.map(item => ({
            provider: item.provider,
            model: item.model,
            attemptNumber: item.attemptNumber,
            status: item.status,
            error: item.error,
        })));
    }
}

module.exports = AIRouter;
