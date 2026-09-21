// routes/subjectRoutes.js
const express = require("express");
const router = express.Router();
const SubjectController = require("../controllers/SubjectController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

router.get("/", verifyToken, SubjectController.getSubjects);
router.get("/:id", verifyToken, SubjectController.getById);

router.post("/", verifyAdmin, SubjectController.create);
router.put("/:id", verifyAdmin, SubjectController.update);
router.delete("/:id", verifyAdmin, SubjectController.delete);

module.exports = router;