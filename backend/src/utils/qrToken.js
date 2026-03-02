const crypto = require('crypto');

const QR_TOKEN_EXPIRY_SECONDS = 30;

/**
 * Generate a compact QR token string for exam join.
 * Format: examId.nonce.exp.sig (dot-separated, base64url sig)
 * Much shorter than JSON → fewer QR dots → easier to scan.
 *
 * @param {string} examId - The exam ID
 * @param {string} secret - HMAC secret key
 * @param {number} expirySeconds - Token expiry in seconds
 * @returns {string} compact token string
 */
function generateQRToken(examId, secret, expirySeconds = QR_TOKEN_EXPIRY_SECONDS) {
    const nonce = crypto.randomBytes(6).toString('hex'); // 12 chars (was 16)
    const exp = Math.floor(Date.now() / 1000) + expirySeconds;

    const payload = `${examId}:${nonce}:${exp}`;
    const sig = crypto.createHmac('sha256', secret)
        .update(payload)
        .digest('base64url')
        .slice(0, 22); // 22 chars of base64url (132 bits, plenty secure)

    return `${examId}.${nonce}.${exp}.${sig}`;
}

/**
 * Parse a QR token from either compact string or legacy JSON format.
 * Compact format: "examId.nonce.exp.sig"
 * Legacy JSON:    { examId, nonce, exp, sig }
 *
 * @param {string|object} raw - Raw token (string or object)
 * @returns {{ examId: string, nonce: string, exp: number, sig: string }}
 */
function parseQRToken(raw) {
    // Already an object (legacy JSON format)
    if (typeof raw === 'object' && raw !== null) {
        return raw;
    }

    if (typeof raw !== 'string') {
        throw new Error('Invalid token type');
    }

    // Try compact dot format first
    const parts = raw.split('.');
    if (parts.length === 4) {
        return {
            examId: parts[0],
            nonce: parts[1],
            exp: parseInt(parts[2], 10),
            sig: parts[3],
        };
    }

    // Fallback: try JSON parse (legacy)
    try {
        return JSON.parse(raw);
    } catch (e) {
        throw new Error('Invalid QR Token format');
    }
}

/**
 * Verify a QR token (works with both compact and legacy formats)
 * @param {{ examId: string, nonce: string, exp: number, sig: string }} token
 * @param {string} secret - HMAC secret key
 * @returns {{ valid: boolean, error?: string }}
 */
function verifyQRToken(token, secret) {
    const { examId, nonce, exp, sig } = token;

    if (!examId || !nonce || !exp || !sig) {
        return { valid: false, error: 'Missing token fields' };
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now > exp) {
        return { valid: false, error: 'Token expired' };
    }

    // Verify signature — check both base64url (compact) and hex (legacy)
    const payload = `${examId}:${nonce}:${exp}`;
    const hmac = crypto.createHmac('sha256', secret).update(payload);

    const expectedBase64 = hmac.digest('base64url').slice(0, 22);
    if (sig === expectedBase64) {
        return { valid: true };
    }

    // Legacy hex format fallback
    const expectedHex = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig === expectedHex) {
        return { valid: true };
    }

    return { valid: false, error: 'Invalid signature' };
}

module.exports = {
    generateQRToken,
    parseQRToken,
    verifyQRToken,
    QR_TOKEN_EXPIRY_SECONDS,
};
