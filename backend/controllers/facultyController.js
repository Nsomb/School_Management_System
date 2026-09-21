// backend/controllers/facultyController.js
const FacultyModel = require("../models/facultyModel");

const FacultyController = {
  create: async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Faculty name is required." });
      }
      const faculty = await FacultyModel.create(name, req.schoolId);
      res.status(201).json(faculty);
    } catch (err) {
      console.error("Create faculty error:", err);
      if (err.code === '23505') {
        return res.status(409).json({ error: "A faculty with this name already exists." });
      }
      res.status(500).json({ error: "Server error" });
    }
  },

  getAll: async (req, res) => {
    try {
      const faculties = await FacultyModel.getAll(req.schoolId);
      res.json(faculties);
    } catch (err) {
      console.error("Get faculties error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
};

module.exports = FacultyController;