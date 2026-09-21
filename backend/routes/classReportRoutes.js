// routes/classReportRoutes.js
const express = require('express');
const router = express.Router();
const ClassReportController = require('../controllers/ClassReportController');
const { verifyAdmin } = require('../middleware/auth');

router.get('/data', verifyAdmin, ClassReportController.getClassReport);
router.get('/pdf', verifyAdmin, ClassReportController.downloadClassReport);

module.exports = router;