const express = require("express");
const { listNotifications } = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/", authMiddleware, listNotifications);

module.exports = router;
