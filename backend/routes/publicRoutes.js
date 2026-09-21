
const express = require("express");
const router = express.Router();
const schoolInfoController = require("../controllers/schoolInfoController");

// Define a public route to get the school information.
router.get("/school-info", schoolInfoController.getSchoolInfo);

module.exports = router;