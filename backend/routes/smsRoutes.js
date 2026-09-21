// routes/smsRoutes.js
const express = require("express");
const router = express.Router();
const smsController = require("../controllers/smsController");
const { verifyAdmin } = require("../middleware/auth");

router.post("/send", verifyAdmin, smsController.sendSMS);
router.get("/history", verifyAdmin, smsController.getHistory);
router.get("/recipients", verifyAdmin, smsController.getRecipientOptions);
router.get("/deliveries/:smsLogId", verifyAdmin, smsController.getDeliveries);

module.exports = router;