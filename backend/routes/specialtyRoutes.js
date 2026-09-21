// routes/specialtyRoutes.js
const express = require("express");
const router = express.Router();
const SpecialtyController = require("../controllers/specialtyController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// Read
router.get("/faculty/:faculty_id", verifyToken, SpecialtyController.getByFaculty);
router.get("/by-faculties", verifyToken, SpecialtyController.getByFaculties); // ⚡ NEW

// Admin
router.post("/", verifyAdmin, SpecialtyController.create);
router.put("/:id", verifyAdmin, SpecialtyController.update);
router.delete("/:id", verifyAdmin, SpecialtyController.delete);

module.exports = router;