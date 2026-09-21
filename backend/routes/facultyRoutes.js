// routes/facultyRoutes.js
const express = require("express");
const router = express.Router();
const FacultyController = require("../controllers/facultyController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// GET /api/faculties — authenticated, school-scoped
router.get("/", verifyToken, FacultyController.getAll);

// POST /api/faculties — admin only
router.post("/", verifyAdmin, FacultyController.create);

module.exports = router;