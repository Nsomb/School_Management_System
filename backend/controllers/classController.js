// backend/controllers/classController.js
const ClassModel = require("../models/ClassModel");

const MAX_NAME_LEN = 100;
const MAX_STREAM_LEN = 100;
const STREAM_PATTERN = /^[A-Za-z0-9 \-&/'().,]*$/;

const normalizeName = (v) => (typeof v === "string" ? v.trim() : "");
const normalizeStream = (v) => {
  const s = normalizeName(v);
  return s.length === 0 ? null : s;
};
const parseOrder = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 999) return NaN;
  return n;
};

const ClassController = {
  // ─── GET all classes (school-scoped) ─────────────────────
  getAll: async (req, res) => {
    try {
      const classes = await ClassModel.getAllClasses(req.schoolId);
      res.json(classes);
    } catch (err) {
      console.error("ClassController.getAll:", err);
      res.status(500).json({ message: "Failed to fetch classes", error: err.message });
    }
  },

  // ─── CREATE ──────────────────────────────────────────────
  create: async (req, res) => {
    try {
      const class_name = normalizeName(req.body.class_name || req.body.name);
      const stream = normalizeStream(req.body.stream);
      const progression_order = parseOrder(req.body.progression_order);

      if (!class_name) {
        return res.status(400).json({ message: "Class name is required." });
      }
      if (class_name.length > MAX_NAME_LEN) {
        return res.status(400).json({
          message: `Class name must be ${MAX_NAME_LEN} characters or fewer.`,
        });
      }
      if (Number.isNaN(progression_order)) {
        return res.status(400).json({
          message: "Progression order must be an integer between 0 and 999 (or leave blank).",
        });
      }
      if (stream && stream.length > MAX_STREAM_LEN) {
        return res.status(400).json({
          message: `Stream must be ${MAX_STREAM_LEN} characters or fewer.`,
        });
      }
      if (stream && !STREAM_PATTERN.test(stream)) {
        return res.status(400).json({
          message: "Stream contains invalid characters.",
        });
      }

      const existing = await ClassModel.getClassByName(class_name, req.schoolId);
      if (existing) {
        return res.status(409).json({
          message: `A class named "${class_name}" already exists.`,
        });
      }

      const created = await ClassModel.create(
        { class_name, progression_order, stream },
        req.schoolId
      );

      res.status(201).json({ message: "Class created successfully.", class: created });
    } catch (err) {
      console.error("ClassController.create:", err);
      if (err.code === "23505") {
        return res.status(409).json({ message: "A class with this name already exists." });
      }
      res.status(500).json({ message: "Failed to create class.", error: err.message });
    }
  },

  // ─── UPDATE ──────────────────────────────────────────────
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const class_name = normalizeName(req.body.class_name || req.body.name);
      const stream = normalizeStream(req.body.stream);
      const progression_order = parseOrder(req.body.progression_order);

      if (!class_name) {
        return res.status(400).json({ message: "Class name is required." });
      }
      if (class_name.length > MAX_NAME_LEN) {
        return res.status(400).json({
          message: `Class name must be ${MAX_NAME_LEN} characters or fewer.`,
        });
      }
      if (Number.isNaN(progression_order)) {
        return res.status(400).json({
          message: "Progression order must be an integer between 0 and 999 (or leave blank).",
        });
      }
      if (stream && stream.length > MAX_STREAM_LEN) {
        return res.status(400).json({
          message: `Stream must be ${MAX_STREAM_LEN} characters or fewer.`,
        });
      }
      if (stream && !STREAM_PATTERN.test(stream)) {
        return res.status(400).json({
          message: "Stream contains invalid characters.",
        });
      }

      const existing = await ClassModel.getClassById(id, req.schoolId);
      if (!existing) {
        return res.status(404).json({ message: "Class not found." });
      }

      const clash = await ClassModel.getClassByName(class_name, req.schoolId);
      if (clash && String(clash.id) !== String(id)) {
        return res.status(409).json({
          message: `A class named "${class_name}" already exists.`,
        });
      }

      // If renaming, propagate to string-based references (subject_classes)
      if (existing.class_name !== class_name) {
        await ClassModel.renameSubjectClassReferences(
          existing.class_name,
          class_name,
          req.schoolId
        );
      }

      const updated = await ClassModel.update(
        id,
        { class_name, progression_order, stream },
        req.schoolId
      );

      res.json({ message: "Class updated successfully.", class: updated });
    } catch (err) {
      console.error("ClassController.update:", err);
      if (err.code === "23505") {
        return res.status(409).json({ message: "A class with this name already exists." });
      }
      res.status(500).json({ message: "Failed to update class.", error: err.message });
    }
  },

  // ─── DELETE ──────────────────────────────────────────────
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await ClassModel.getClassById(id, req.schoolId);
      if (!existing) {
        return res.status(404).json({ message: "Class not found." });
      }

      const studentCount = await ClassModel.countStudents(id, req.schoolId);
      if (studentCount > 0) {
        return res.status(400).json({
          message: `Cannot delete "${existing.class_name}" — ${studentCount} student(s) are still assigned to it. Transfer them first.`,
          studentCount,
        });
      }

      const assignmentCount = await ClassModel.countTeacherAssignments(id, req.schoolId);
      if (assignmentCount > 0) {
        return res.status(400).json({
          message: `Cannot delete "${existing.class_name}" — it still has ${assignmentCount} teacher assignment(s). Remove them first.`,
          assignmentCount,
        });
      }

      // Clean up string-based subject_classes references
      await ClassModel.deleteSubjectClassReferences(existing.class_name, req.schoolId);

      await ClassModel.delete(id, req.schoolId);

      res.json({ message: `Class "${existing.class_name}" deleted successfully.` });
    } catch (err) {
      console.error("ClassController.delete:", err);
      res.status(500).json({ message: "Failed to delete class.", error: err.message });
    }
  },
};

module.exports = ClassController;