// routes/academicYearRoutes.js
const express = require('express');
const router = express.Router();
const { AcademicYearController } = require('../controllers/academicYearController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ─── PUBLIC (platform-wide, no tenant scoping needed) ───
router.get('/current', AcademicYearController.getCurrentAcademicYear);
router.get('/', AcademicYearController.getAcademicYears);
router.get('/calendar/all', AcademicYearController.getAcademicCalendar);

// ─── AUTHENTICATED ──────────────────────────────────────
router.get('/:academic_year/terms', verifyToken, AcademicYearController.getTermsByAcademicYear);

// ─── ADMIN ONLY ─────────────────────────────────────────
router.post('/setup', verifyAdmin, AcademicYearController.setupAcademicYear);
router.put('/term/:id', verifyAdmin, AcademicYearController.updateAcademicTerm);
router.post('/auto-archive', verifyAdmin, AcademicYearController.autoArchiveOldYears);
router.delete('/:academic_year', verifyAdmin, AcademicYearController.deleteAcademicYear);

module.exports = router;