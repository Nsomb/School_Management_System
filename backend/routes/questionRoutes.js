// routes/questionRoutes.js
const express = require("express");
const router = express.Router();
const QuestionController = require("../controllers/questionController");
const { verifyTeacher } = require("../middleware/auth");
const { verifyAdmin } = require("../middleware/auth");

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_BASE = path.join(__dirname, '..', 'uploads', 'questions');

// ─── Multer storage: namespaced per school ──────────────
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // verifyTeacher / verifyAdmin has already run — schoolId is attached
        const schoolId = req.teacher?.schoolId || req.user?.schoolId;

        if (!schoolId) {
            return cb(new Error('No school context available for file upload.'));
        }

        const dir = path.join(UPLOAD_BASE, `school_${schoolId}`);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'question-' + uniqueSuffix + '.pdf');
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- TEACHER ROUTES ---
router.post("/", verifyTeacher, upload.single('questionPdf'), QuestionController.submitQuestion);
router.put("/:id/file", verifyTeacher, upload.single('questionPdf'), QuestionController.replaceQuestionFile);
router.get("/my", verifyTeacher, QuestionController.viewMyQuestions);
router.get("/download/:id", verifyTeacher, QuestionController.downloadMyQuestion);
router.delete("/:id", verifyTeacher, QuestionController.deleteQuestion);

// --- ADMIN ROUTES ---
router.get("/", verifyAdmin, QuestionController.getAllQuestions);
router.put("/:id/status", verifyAdmin, QuestionController.updateQuestionStatus);
router.get("/admin/download/:id", verifyAdmin, QuestionController.downloadAnyQuestion);

module.exports = router;