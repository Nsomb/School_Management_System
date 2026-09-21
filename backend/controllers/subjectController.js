// backend/controllers/SubjectController.js
const SubjectModel = require("../models/subjectModel");
const Joi = require('joi');

const subjectSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  coefficient: Joi.number().required().min(1).max(20),
  // Accept EITHER faculty_id (single, legacy) OR faculty_ids (array, new)
  faculty_id: Joi.number().optional(),
  faculty_ids: Joi.array().items(Joi.number()).optional(),
  specialty_id: Joi.number().allow(null).optional(),
  specialty_ids: Joi.array().items(Joi.number()).optional(),
  classes: Joi.array().items(Joi.string()).optional(),
});

function normalizePayload(body) {
  const value = body;

  // Faculty: prefer faculty_ids; fall back to [faculty_id]
  let faculty_ids = Array.isArray(value.faculty_ids) ? value.faculty_ids : [];
  if (faculty_ids.length === 0 && value.faculty_id !== undefined && value.faculty_id !== null) {
    faculty_ids = [value.faculty_id];
  }

  // Specialties: same pattern
  let specialty_ids = Array.isArray(value.specialty_ids) ? value.specialty_ids : [];
  if (specialty_ids.length === 0 && value.specialty_id !== undefined && value.specialty_id !== null) {
    specialty_ids = [value.specialty_id];
  }

  return {
    name: value.name,
    coefficient: value.coefficient,
    faculty_ids,
    specialty_ids,
    classes: Array.isArray(value.classes) ? value.classes : [],
  };
}

const SubjectController = {
  create: async (req, res) => {
    try {
      const { error, value } = subjectSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          message: "Validation error",
          details: error.details.map((d) => d.message),
        });
      }

      const payload = normalizePayload(value);

      if (payload.faculty_ids.length === 0) {
        return res.status(400).json({
          message: "At least one faculty is required.",
        });
      }

      const created = await SubjectModel.create(payload, req.schoolId);
      res.status(201).json({ message: "Subject created successfully.", subject: created });
    } catch (error) {
      console.error("Error creating subject:", error);
      if (error.code === '23505') {
        return res.status(409).json({ message: "Subject with this name already exists." });
      }
      res.status(500).json({ message: "Failed to create subject.", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { error, value } = subjectSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          message: "Validation error",
          details: error.details.map((d) => d.message),
        });
      }

      const payload = normalizePayload(value);

      if (payload.faculty_ids.length === 0) {
        return res.status(400).json({ message: "At least one faculty is required." });
      }

      const updated = await SubjectModel.update(id, payload, req.schoolId);
      if (!updated) {
        return res.status(404).json({ message: `Subject with ID '${id}' not found.` });
      }

      res.status(200).json({ message: "Subject updated successfully.", subject: updated });
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ message: "Failed to update subject.", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await SubjectModel.delete(id, req.schoolId);
      if (!deleted) {
        return res.status(404).json({ message: `Subject with ID '${id}' not found.` });
      }
      res.status(200).json({
        message: `Subject '${deleted.name}' deleted successfully.`,
        subject: deleted,
      });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ message: "Failed to delete subject.", error: error.message });
    }
  },

  getSubjects: async (req, res) => {
    try {
      const { class_id } = req.query;

      if (class_id) {
        const subjects = await SubjectModel.getByClassId(class_id, req.schoolId);
        return res.status(200).json({ subjects });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100; // bumped default from 20
      const skip = (page - 1) * limit;

      const { subjects, total } = await SubjectModel.getAllWithPagination(skip, limit, req.schoolId);

      res.status(200).json({
        subjects,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to retrieve subjects.", error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const subject = await SubjectModel.getById(id, req.schoolId);
      if (!subject) {
        return res.status(404).json({ message: `Subject with ID '${id}' not found.` });
      }
      res.status(200).json({ subject });
    } catch (error) {
      console.error("Error fetching subject:", error);
      res.status(500).json({ message: "Failed to retrieve subject.", error: error.message });
    }
  },
};

module.exports = SubjectController;