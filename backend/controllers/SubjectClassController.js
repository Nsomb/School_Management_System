// backend/controllers/SubjectClassController.js
const SubjectClassModel = require('../models/SubjectClassModel');
const Joi = require('joi');

const subjectClassSchema = Joi.object({
  subject_id: Joi.string().required(),
  class_name: Joi.string().required().pattern(/^Form [1-6]|Lower Sixth|Upper Sixth$/),
});

const batchSubjectClassSchema = Joi.object({
  subject_id: Joi.string().required(),
  class_names: Joi.array().items(Joi.string().pattern(/^Form [1-6]|Lower Sixth|Upper Sixth$/)).min(1).required(),
});

const updateSchema = Joi.object({
  subject_id: Joi.string(),
  class_name: Joi.string().pattern(/^Form [1-6]|Lower Sixth|Upper Sixth$/),
}).min(1);

const SubjectClassController = {
  createSubjectClass: async (req, res) => {
    try {
      const { error, value } = subjectClassSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: "Validation error", details: error.details.map(d => d.message) });
      }
      const { subject_id, class_name } = value;
      const newLink = await SubjectClassModel.create({ subject_id, class_name }, req.schoolId);

      res.status(201).json({ message: "Subject-class link created successfully.", subjectClass: newLink });
    } catch (error) {
      console.error("Error creating subject-class link:", error);
      if (error.code === '23505') return res.status(409).json({ error: "This subject is already linked to this class." });
      if (error.code === '23503') return res.status(400).json({ error: "Invalid subject ID or class name." });
      res.status(500).json({ error: "Failed to create subject-class link." });
    }
  },

  createBatchSubjectClasses: async (req, res) => {
    try {
      const { error, value } = batchSubjectClassSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: "Validation error", details: error.details.map(d => d.message) });
      }
      const { subject_id, class_names } = value;
      const created = await Promise.all(
        class_names.map(cn => SubjectClassModel.create({ subject_id, class_name: cn }, req.schoolId))
      );
      res.status(201).json({ message: `${created.length} links created.`, subjectClasses: created });
    } catch (error) {
      console.error("Error creating batch subject-class links:", error);
      res.status(500).json({ error: "Failed to create subject-class links." });
    }
  },

  updateSubjectClass: async (req, res) => {
    try {
      const { id } = req.params;
      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: "Validation error", details: error.details.map(d => d.message) });
      }
      const updated = await SubjectClassModel.update(id, value, req.schoolId);
      if (!updated) return res.status(404).json({ error: `Link ID ${id} not found.` });
      res.status(200).json({ message: "Link updated successfully.", subjectClass: updated });
    } catch (error) {
      console.error("Error updating subject-class link:", error);
      res.status(500).json({ error: "Failed to update subject-class link." });
    }
  },

  getAllSubjectClasses: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const links = await SubjectClassModel.getAll(req.schoolId);
      res.status(200).json({
        subjectClasses: links.slice(skip, skip + limit),
        pagination: { page, limit, total: links.length, pages: Math.ceil(links.length / limit) },
      });
    } catch (error) {
      console.error("Error fetching subject-class links:", error);
      res.status(500).json({ error: "Failed to retrieve subject-class links." });
    }
  },

  getSubjectsForClass: async (req, res) => {
    try {
      const { class_name } = req.params;
      if (!class_name) return res.status(400).json({ error: "Class name is required." });
      const subjects = await SubjectClassModel.getSubjectsByClass(class_name, req.schoolId);
      res.status(200).json({ subjects });
    } catch (error) {
      console.error("Error fetching subjects for class:", error);
      res.status(500).json({ error: "Failed to retrieve subjects for class." });
    }
  },

  getSubjectsByClassId: async (req, res) => {
    try {
      const { class_id } = req.params;
      if (!class_id) return res.status(400).json({ error: "Class ID is required." });
      const subjects = await SubjectClassModel.getSubjectsByClassId(class_id, req.schoolId);
      res.status(200).json({ subjects });
    } catch (error) {
      console.error("Error fetching subjects for class ID:", error);
      res.status(500).json({ error: "Failed to retrieve subjects for class." });
    }
  },

  getDistinctClassNames: async (req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=3600');
      const classNames = await SubjectClassModel.getDistinctClassNames(req.schoolId);
      res.status(200).json({ classNames });
    } catch (error) {
      console.error("Error fetching distinct class names:", error);
      res.status(500).json({ error: "Failed to retrieve distinct class names." });
    }
  },

  deleteSubjectClass: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await SubjectClassModel.delete(id, req.schoolId);
      if (!deleted) return res.status(404).json({ error: `Link ID ${id} not found.` });
      res.status(200).json({ message: "Link deleted successfully.", subjectClass: deleted });
    } catch (error) {
      console.error("Error deleting subject-class link:", error);
      res.status(500).json({ error: "Failed to delete subject-class link." });
    }
  },

  deleteBySubject: async (req, res) => {
    try {
      const { subject_id } = req.params;
      const deleted = await SubjectClassModel.deleteBySubject(subject_id, req.schoolId);
      if (deleted.length === 0) return res.status(404).json({ error: "No links found for this subject." });
      res.status(200).json({ message: `${deleted.length} links deleted.`, deletedLinks: deleted });
    } catch (error) {
      console.error("Error deleting subject-class links:", error);
      res.status(500).json({ error: "Failed to delete links by subject." });
    }
  },

  deleteByClass: async (req, res) => {
    try {
      const { class_name } = req.params;
      const deleted = await SubjectClassModel.deleteByClass(class_name, req.schoolId);
      if (deleted.length === 0) return res.status(404).json({ error: "No links found for this class." });
      res.status(200).json({ message: `${deleted.length} links deleted.`, deletedLinks: deleted });
    } catch (error) {
      console.error("Error deleting subject-class links:", error);
      res.status(500).json({ error: "Failed to delete links by class." });
    }
  },

  getClassesWithSubjectCounts: async (req, res) => {
    try {
      const classes = await SubjectClassModel.getSubjectCountsByClass(req.schoolId);
      res.status(200).json({ classes });
    } catch (error) {
      console.error("Error fetching classes with subject counts:", error);
      res.status(500).json({ error: "Failed to retrieve classes with subject counts." });
    }
  },
};

module.exports = SubjectClassController;