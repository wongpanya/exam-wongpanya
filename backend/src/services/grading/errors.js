class GradingError extends Error {
    constructor(message, { code = 'GRADING_ERROR', retriable = false, statusCode = 502, details } = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.retriable = retriable;
        this.statusCode = statusCode;
        this.details = details;
    }
}

class ProviderError extends GradingError {}

class GradeValidationError extends GradingError {
    constructor(message, details) {
        super(message, {
            code: 'INVALID_GRADE',
            retriable: true,
            statusCode: 502,
            details,
        });
    }
}

class AllProvidersFailedError extends GradingError {
    constructor(attempts) {
        const summary = attempts
            .filter(item => item?.error?.message)
            .map(item => `${item.provider}: ${item.error.message}`)
            .join(' | ')
            .slice(0, 1000);
        super(summary || 'All configured AI grading providers failed', {
            code: 'ALL_PROVIDERS_FAILED',
            retriable: false,
            statusCode: 503,
            details: attempts,
        });
        this.attempts = attempts;
    }
}

const classifyHttpError = (status, message = 'Provider request failed') => {
    if (status === 401 || status === 403) {
        return new ProviderError(message, { code: 'AUTHENTICATION_ERROR', statusCode: 502 });
    }
    if (status === 429) {
        return new ProviderError(message, { code: 'RATE_LIMIT', retriable: true, statusCode: 503 });
    }
    if (status === 408 || status === 504) {
        return new ProviderError(message, { code: 'TIMEOUT', retriable: true, statusCode: 504 });
    }
    if (status >= 500) {
        return new ProviderError(message, { code: 'PROVIDER_UNAVAILABLE', retriable: true, statusCode: 503 });
    }
    return new ProviderError(message, { code: 'PROVIDER_ERROR', statusCode: 502 });
};

const toSafeError = (error) => ({
    code: error?.code || 'UNKNOWN_ERROR',
    message: String(error?.message || 'Unknown grading error').slice(0, 1000),
    retriable: Boolean(error?.retriable),
});

module.exports = {
    GradingError,
    ProviderError,
    GradeValidationError,
    AllProvidersFailedError,
    classifyHttpError,
    toSafeError,
};
