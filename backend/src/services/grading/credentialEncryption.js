const crypto = require('crypto');
const { GradingError } = require('./errors');

const getEncryptionKey = () => {
    // Existing deployments already require JWT_SECRET. Use it as a stable fallback so
    // enabling per-teacher keys does not require a separate environment rollout.
    const secret = String(process.env.AI_CREDENTIALS_ENCRYPTION_KEY || process.env.JWT_SECRET || '');
    if (!secret) {
        throw new GradingError('AI credential encryption is not configured', {
            code: 'CREDENTIAL_ENCRYPTION_NOT_CONFIGURED',
            statusCode: 503,
        });
    }
    return crypto.createHash('sha256').update(secret, 'utf8').digest();
};

const encryptApiKey = (apiKey) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(String(apiKey), 'utf8'),
        cipher.final(),
    ]);
    return {
        encryptedApiKey: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
    };
};

const decryptApiKey = ({ encryptedApiKey, iv, authTag }) => {
    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            getEncryptionKey(),
            Buffer.from(iv, 'base64')
        );
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));
        return Buffer.concat([
            decipher.update(Buffer.from(encryptedApiKey, 'base64')),
            decipher.final(),
        ]).toString('utf8');
    } catch (error) {
        if (error?.code === 'CREDENTIAL_ENCRYPTION_NOT_CONFIGURED') throw error;
        throw new GradingError('Could not decrypt the teacher AI credential', {
            code: 'CREDENTIAL_DECRYPTION_FAILED',
            statusCode: 500,
        });
    }
};

module.exports = { getEncryptionKey, encryptApiKey, decryptApiKey };
