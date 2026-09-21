// routes/studentRoutes.js
const express = require("express");
const router = express.Router();
const StudentController = require("../controllers/studentController");

// --- CHANGE THIS LINE ---
// OLD: const verifyAdmin = require("../middleware/auth");
// NEW: Destructure the named export 'verifyAdmin'
const { verifyAdmin } = require("../middleware/auth"); // Correctly importing verifyAdmin

// --- Student Management (CRUD) Routes ---
// GET /api/students - Get all students (with optional class_name query param)
router.get("/", verifyAdmin, StudentController.getAllStudents);
// POST /api/students - Add a new student
router.post("/", verifyAdmin, StudentController.createStudent);

// NEW: GET /api/students/search?name=... - Search for students by name (returns array)
router.get("/search", verifyAdmin, StudentController.searchStudentsByName);

// GET /api/students/:id - Get a single student by ID
router.get("/:id", verifyAdmin, StudentController.getStudentById);
// PUT /api/students/:id - Update student details (Editing) by ID
router.put("/:id", verifyAdmin, StudentController.updateStudent);
// DELETE /api/students/:id - Delete a student by ID
router.delete("/:id", verifyAdmin, StudentController.deleteStudent);

// --- Student Transfer & Promotion Routes ---
// PUT /api/students/transfer/:id - Transfer a single student's class and/or primary specialty by ID
router.put("/transfer/:id", verifyAdmin, StudentController.transferStudent);
// POST /api/students/specialty/:id - Add a secondary specialty to a student by ID
router.post("/specialty/:id", verifyAdmin, StudentController.addStudentSpecialty);

// PUT /api/students/bulk-transfer - Bulk transfer specific students to a new class (uses IDs in body)
router.put("/bulk-transfer", verifyAdmin, StudentController.bulkTransferStudents);
// POST /api/students/transfer-class - Transfer an entire class to a new class (e.g., for academic year change)
router.post("/transfer-class", verifyAdmin, StudentController.transferClass);

// POST /api/students/promote/:id - Promote a student by ID based on report card
router.post("/promote/:id", verifyAdmin, StudentController.promoteStudentBasedOnReportCard);


module.exports = router;