// routes/classListRoutes.js
const express = require('express');
const router = express.Router();
const ClassListController = require('../controllers/ClassListController');
const { verifyAdmin } = require('../middleware/auth');

router.get('/blank-mark-sheet', verifyAdmin, ClassListController.getBlankMarkEntrySheet);
router.get('/distinct-class-names', verifyAdmin, ClassListController.getDistinctClassNamesFromStudents);
router.get('/students', verifyAdmin, ClassListController.getCurrentClassStudents);
router.get('/pdf', verifyAdmin, ClassListController.downloadClassListPDF);

module.exports = router;