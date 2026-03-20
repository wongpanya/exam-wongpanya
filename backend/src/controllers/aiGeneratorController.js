const asyncHandler = require('express-async-handler');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { parse } = require('csv-parse/sync');
const path = require('path');

// Azure OpenAI config from env
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const AZURE_ENDPOINT_BASE = process.env.AZURE_ENDPOINT_BASE;
const AZURE_DEPLOYMENT_NAME = process.env.AZURE_DEPLOYMENT_NAME;
const AZURE_API_VERSION = process.env.AZURE_API_VERSION;

// Bloom's Taxonomy mapping (Thai → English instruction)
const BLOOM_LEVELS = {
    'remember': {
        th: 'จำ',
        instruction: 'Create questions that test recall and recognition of facts, terms, and basic concepts. Use verbs like: define, list, name, identify, recall.',
    },
    'understand': {
        th: 'เข้าใจ',
        instruction: 'Create questions that test comprehension and interpretation. Students should explain ideas or concepts. Use verbs like: describe, explain, summarize, classify, compare.',
    },
    'apply': {
        th: 'ประยุกต์',
        instruction: 'Create questions that test the ability to use information in new situations. Use verbs like: apply, demonstrate, solve, use, implement.',
    },
    'analyze': {
        th: 'วิเคราะห์',
        instruction: 'Create questions that test the ability to draw connections, organize, and distinguish between parts. Use verbs like: analyze, differentiate, examine, compare, contrast.',
    },
    'evaluate': {
        th: 'ประเมิน',
        instruction: 'Create questions that test the ability to justify a decision or make judgments. Use verbs like: evaluate, judge, justify, critique, assess.',
    },
    'create': {
        th: 'สร้างสรรค์',
        instruction: 'Create questions that test the ability to produce new or original work, combine elements in new ways. Use verbs like: design, construct, develop, formulate, propose.',
    },
};

/**
 * Extract text content from uploaded file
 */
async function extractFileContent(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const result = { filename: file.originalname, pages: [] };

    try {
        if (ext === '.pdf') {
            const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
            await parser.load();
            const textResult = await parser.getText();
            // textResult = { pages: [{ text, num }], text, total }
            if (textResult.pages && textResult.pages.length > 0) {
                textResult.pages.forEach((page) => {
                    const trimmed = page.text.trim();
                    if (trimmed) {
                        result.pages.push({
                            pageNum: page.num,
                            content: trimmed,
                        });
                    }
                });
            }
            // Fallback: if pages didn't work, use full text
            if (result.pages.length === 0 && textResult.text?.trim()) {
                result.pages.push({ pageNum: 1, content: textResult.text.trim() });
            }
            parser.destroy();
        } else if (ext === '.docx' || ext === '.doc') {
            const { value } = await mammoth.extractRawText({ buffer: file.buffer });
            if (value.trim()) {
                result.pages.push({ pageNum: 1, content: value.trim() });
            }
        } else if (ext === '.csv') {
            const records = parse(file.buffer.toString('utf-8'), {
                columns: true,
                skip_empty_lines: true,
            });
            // Convert CSV rows to readable text
            const csvText = records.map((row, i) => {
                return `Row ${i + 1}: ${Object.entries(row).map(([k, v]) => `${k}=${v}`).join(', ')}`;
            }).join('\n');
            if (csvText.trim()) {
                result.pages.push({ pageNum: 1, content: csvText.trim() });
            }
        } else {
            throw new Error(`Unsupported file type: ${ext}`);
        }
    } catch (err) {
        console.error(`[AI Generator] Error extracting ${file.originalname}:`, err.message);
        result.error = err.message;
    }

    return result;
}

/**
 * Build content string with source markers for traceability
 */
function buildSourcedContent(extractedFiles) {
    let content = '';
    for (const file of extractedFiles) {
        if (file.error) {
            content += `\n[FILE: ${file.filename} — ERROR: ${file.error}]\n`;
            continue;
        }
        for (const page of file.pages) {
            content += `\n[SOURCE: ${file.filename} | Page ${page.pageNum}]\n`;
            content += page.content + '\n';
            content += `[/SOURCE]\n`;
        }
    }
    return content;
}

// @desc    Generate exam questions from uploaded files using AI
// @route   POST /api/ai-generator/generate
// @access  Private/Teacher
const generateQuestions = asyncHandler(async (req, res) => {
    if (!AZURE_API_KEY || !AZURE_ENDPOINT_BASE || !AZURE_DEPLOYMENT_NAME) {
        res.status(500);
        throw new Error('Azure OpenAI is not configured. Please set environment variables.');
    }

    const files = req.files;
    console.log('[AI Generator] Received files:', files?.map(f => `${f.originalname} (${f.size} bytes, ${f.mimetype})`));

    if (!files || files.length === 0) {
        res.status(400);
        throw new Error('กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์');
    }

    const {
        numQuestions = 5,
        bloomLevel = 'understand',
        language = 'th',
        questionType = 'radio',
    } = req.body;

    // 1. Extract content from all files
    const extractedFiles = await Promise.all(files.map(extractFileContent));
    console.log('[AI Generator] Extraction results:', extractedFiles.map(f => ({
        file: f.filename,
        pages: f.pages?.length || 0,
        error: f.error || null,
    })));

    // Check if any content was extracted
    const hasContent = extractedFiles.some(f => f.pages && f.pages.length > 0);
    if (!hasContent) {
        const errors = extractedFiles.filter(f => f.error).map(f => `${f.filename}: ${f.error}`).join('; ');
        res.status(400);
        throw new Error(`ไม่สามารถอ่านเนื้อหาจากไฟล์ได้: ${errors || 'ไฟล์เนื้อหาว่าง'}`);
    }

    // 2. Build sourced content
    const sourcedContent = buildSourcedContent(extractedFiles);

    // 3. Get bloom instruction
    const bloom = BLOOM_LEVELS[bloomLevel] || BLOOM_LEVELS['understand'];

    // 4. Build system + user prompts
    const isMultipleChoice = questionType === 'radio';
    const langInstruction = language === 'th'
        ? 'Generate all questions and choices in Thai language.'
        : 'Generate all questions and choices in English.';

    const questionTypeInstruction = isMultipleChoice
        ? `Generate multiple-choice questions with exactly 4 choices each (a, b, c, d). One choice must be the correct answer. Make the distractors (wrong choices) plausible but clearly incorrect based on the source material.`
        : `Generate short-answer questions. For correctAnswer, provide a concise model answer.`;

    const systemPrompt = `You are an expert exam question generator for university professors. Your task is to create high-quality exam questions STRICTLY based on the provided source material.

CRITICAL RULES:
1. ONLY use information from the provided source material. Do NOT add external knowledge.
2. Each question MUST include a "source" field indicating which file and page the question is based on.
3. ${bloom.instruction}
4. ${questionTypeInstruction}
5. ${langInstruction}
6. Generate exactly ${numQuestions} questions.

OUTPUT FORMAT — Return ONLY a valid JSON array, no markdown, no explanation:
${isMultipleChoice ? `[
  {
    "prompt": "Question text here",
    "choices": [
      { "value": "a", "label": "Choice A text" },
      { "value": "b", "label": "Choice B text" },
      { "value": "c", "label": "Choice C text" },
      { "value": "d", "label": "Choice D text" }
    ],
    "correctAnswer": "a",
    "points": 1,
    "source": "filename.pdf, Page 3",
    "bloomLevel": "${bloomLevel}"
  }
]` : `[
  {
    "prompt": "Question text here",
    "choices": [],
    "correctAnswer": "Model answer text",
    "points": 1,
    "source": "filename.pdf, Page 3",
    "bloomLevel": "${bloomLevel}"
  }
]`}`;

    const userPrompt = `Here is the source material from the uploaded teaching files. Generate ${numQuestions} exam questions based ONLY on this content:\n\n${sourcedContent}`;

    // 5. Call Azure OpenAI
    const apiUrl = `${AZURE_ENDPOINT_BASE}/openai/deployments/${AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const requestBody = {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 4096,
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_API_KEY,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('Azure OpenAI Error:', response.status, errText);
        res.status(502);
        throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
        res.status(502);
        throw new Error('AI did not return any content');
    }

    // 6. Parse AI response
    let questions;
    try {
        // Remove potential markdown code fences
        const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        questions = JSON.parse(cleaned);
    } catch (parseErr) {
        console.error('Failed to parse AI response:', aiContent);
        res.status(502);
        throw new Error('AI returned invalid JSON. Please try again.');
    }

    // 7. Validate & normalize questions
    if (!Array.isArray(questions)) {
        res.status(502);
        throw new Error('AI response is not an array of questions');
    }

    const processedQuestions = questions.map((q, index) => ({
        questionId: `AI_Q${String(index + 1).padStart(3, '0')}`,
        type: isMultipleChoice ? 'radio' : 'text',
        prompt: q.prompt || '',
        choices: q.choices || [],
        correctAnswer: q.correctAnswer || '',
        points: q.points || 1,
        source: q.source || 'Unknown',
        bloomLevel: q.bloomLevel || bloomLevel,
    }));

    // 8. Return result
    res.json({
        questions: processedQuestions,
        metadata: {
            filesProcessed: extractedFiles.map(f => ({
                filename: f.filename,
                pages: f.pages?.length || 0,
                error: f.error || null,
            })),
            totalQuestions: processedQuestions.length,
            bloomLevel,
            questionType,
            tokensUsed: data.usage || null,
        },
    });
});

module.exports = { generateQuestions };
