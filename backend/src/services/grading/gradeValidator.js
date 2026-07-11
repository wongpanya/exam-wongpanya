const { gradeRequestSchema, gradeCandidateSchema } = require('./contracts');
const { GradeValidationError } = require('./errors');

const normalizeText = (value) => String(value || '')
    .normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();

const validateGradeRequest = (request) => {
    const parsed = gradeRequestSchema.safeParse(request);
    if (!parsed.success) {
        throw new GradeValidationError('Invalid grade request', parsed.error.issues);
    }
    return parsed.data;
};

const validateGradeCandidate = (candidate, rawRequest) => {
    const request = validateGradeRequest(rawRequest);
    const parsed = gradeCandidateSchema.safeParse(candidate);
    if (!parsed.success) {
        throw new GradeValidationError('Provider returned an invalid grade shape', parsed.error.issues);
    }

    const result = parsed.data;
    const rubricMap = new Map(request.rubric.map(item => [item.id, item]));
    const returnedIds = result.criteria.map(item => item.rubricId);

    if (new Set(returnedIds).size !== returnedIds.length) {
        throw new GradeValidationError('Provider returned duplicate rubric IDs');
    }
    if (returnedIds.length !== rubricMap.size || returnedIds.some(id => !rubricMap.has(id))) {
        throw new GradeValidationError('Provider rubric IDs do not match the request');
    }

    for (const criterion of result.criteria) {
        const canonical = rubricMap.get(criterion.rubricId);
        if (Math.abs(criterion.maxScore - canonical.maxScore) > 1e-6) {
            throw new GradeValidationError(`Rubric maximum mismatch for ${criterion.rubricId}`);
        }
        if (criterion.score < 0 || criterion.score > canonical.maxScore + 1e-6) {
            throw new GradeValidationError(`Rubric score out of range for ${criterion.rubricId}`);
        }
    }

    const criteriaTotal = result.criteria.reduce((sum, item) => sum + item.score, 0);
    if (Math.abs(criteriaTotal - result.totalScore) > 1e-6) {
        throw new GradeValidationError('Total score does not equal the rubric score sum');
    }
    if (Math.abs(result.maxScore - request.maxScore) > 1e-6 || result.totalScore > request.maxScore + 1e-6) {
        throw new GradeValidationError('Overall score is outside the canonical maximum');
    }

    const normalizedAnswer = normalizeText(request.studentAnswer);
    for (const criterion of result.criteria) {
        for (const evidence of criterion.evidence) {
            if (!normalizedAnswer.includes(normalizeText(evidence))) {
                throw new GradeValidationError(`Evidence for ${criterion.rubricId} is not present in the student answer`);
            }
        }
    }

    if (result.needsHumanReview && !result.reviewReason) {
        throw new GradeValidationError('reviewReason is required when human review is requested');
    }

    const canonicalConcepts = new Set(request.keyConcepts);
    const detected = new Set(result.detectedConcepts);
    const missing = new Set(result.missingConcepts);
    if (detected.size !== result.detectedConcepts.length || missing.size !== result.missingConcepts.length) {
        throw new GradeValidationError('Detected and missing concepts cannot contain duplicates');
    }
    if ([...detected, ...missing].some(concept => !canonicalConcepts.has(concept))) {
        throw new GradeValidationError('Provider returned a concept that was not requested');
    }
    if ([...detected].some(concept => missing.has(concept))) {
        throw new GradeValidationError('Detected and missing concepts must not overlap');
    }
    const returnedConcepts = new Set([...detected, ...missing]);
    if (returnedConcepts.size !== canonicalConcepts.size || [...canonicalConcepts].some(concept => !returnedConcepts.has(concept))) {
        throw new GradeValidationError('Detected and missing concepts must cover every requested key concept');
    }

    return result;
};

module.exports = { normalizeText, validateGradeRequest, validateGradeCandidate };
