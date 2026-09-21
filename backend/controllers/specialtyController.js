// backend/controllers/specialtyController.js
const SpecialtyModel = require("../models/specialtyModel");

const getSchoolId = (req) => {
  const sid = req.schoolId || req.user?.schoolId;
  if (!sid) throw new Error('No school context available');
  return sid;
};

const SpecialtyController = {
  create: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { name, faculty_id } = req.body;
      if (!name || !faculty_id) {
        return res.status(400).json({ error: "Specialty name and faculty ID are required." });
      }
      const specialty = await SpecialtyModel.create({ name, faculty_id }, schoolId);
      res.status(201).json({ message: "Specialty created successfully.", specialty });
    } catch (err) {
      console.error("Create specialty error:", err);
      if (err.code === '23505') {
        return res.status(409).json({ error: "A specialty with this name already exists for this faculty." });
      }
      if (err.code === '23503') {
        return res.status(400).json({ error: "Invalid faculty ID provided." });
      }
      res.status(500).json({ error: "Server error occurred while creating specialty." });
    }
  },

  getByFaculty: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { faculty_id } = req.params;
      const specialties = await SpecialtyModel.getByFaculty(faculty_id, schoolId);
      res.status(200).json({ specialties });
    } catch (err) {
      console.error("Get by faculty error:", err);
      res.status(500).json({ error: "Server error occurred while fetching specialties." });
    }
  },

  // ⚡ NEW: fetch specialties for multiple faculties in one call
  // GET /api/specialties/by-faculties?facultyIds=1,2,3
  getByFaculties: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const raw = req.query.facultyIds || '';
      const facultyIds = String(raw)
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n > 0);

      if (facultyIds.length === 0) {
        return res.status(200).json({ specialties: [] });
      }

      const specialties = await SpecialtyModel.getByFaculties(facultyIds, schoolId);
      res.status(200).json({ specialties });
    } catch (err) {
      console.error("Get by faculties error:", err);
      res.status(500).json({ error: "Server error occurred while fetching specialties." });
    }
  },

  update: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { id } = req.params;
      const { name, faculty_id } = req.body;
      if (!name && !faculty_id) {
        return res.status(400).json({ error: "At least one field must be provided for update." });
      }
      const updated = await SpecialtyModel.update(id, { name, faculty_id }, schoolId);
      if (!updated) {
        return res.status(404).json({ error: "Specialty not found." });
      }
      res.status(200).json({ message: "Specialty updated successfully.", specialty: updated });
    } catch (err) {
      console.error("Update specialty error:", err);
      if (err.code === '23505') {
        return res.status(409).json({ error: "A specialty with this name already exists for this faculty." });
      }
      res.status(500).json({ error: "Server error occurred while updating specialty." });
    }
  },

  delete: async (req, res) => {
    try {
      const schoolId = getSchoolId(req);
      const { id } = req.params;
      const deleted = await SpecialtyModel.delete(id, schoolId);
      if (!deleted) {
        return res.status(404).json({ error: "Specialty not found." });
      }
      res.status(200).json({ message: "Specialty deleted successfully." });
    } catch (err) {
      console.error("Delete specialty error:", err);
      res.status(500).json({ error: "Server error occurred while deleting specialty." });
    }
  },
};

module.exports = SpecialtyController;