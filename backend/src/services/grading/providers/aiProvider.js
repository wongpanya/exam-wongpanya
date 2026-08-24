const { ProviderError } = require('../errors');

class AIProvider {
    constructor({ name, model }) {
        this.name = name;
        this.model = model;
    }

    isConfigured() {
        return false;
    }

    async healthCheck() {
        return this.isConfigured();
    }

    async grade() {
        throw new ProviderError(`Provider ${this.name} does not implement grade()`, {
            code: 'PROVIDER_NOT_IMPLEMENTED',
        });
    }
}

module.exports = AIProvider;
