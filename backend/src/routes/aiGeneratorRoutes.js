const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { generateQuestions } = require('../controllers/aiGeneratorController');
const { protect, teacher } = require('../middleware/authMiddleware');

// Allowed extensions (no image support per user request)
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.csv'];

// Configure multer for memory storage with file size limits
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB per file
        files: 10, // max 10 files
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`ไม่รองรับไฟล์ประเภท ${ext} — รองรับเฉพาะ PDF, DOCX, CSV`), false);
        }
    },
});

// Multer error handling wrapper
const handleUpload = (req, res, next) => {
    const uploadMiddleware = upload.array('files', 10);
    uploadMiddleware(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'ไฟล์มีขนาดเกิน 10 MB' });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ message: 'อัปโหลดได้สูงสุด 10 ไฟล์' });
                }
                return res.status(400).json({ message: err.message });
            }
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

// POST /api/ai-generator/generate
router.post('/generate', protect, teacher, handleUpload, generateQuestions);

module.exports = router;
