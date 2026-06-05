const express = require("express");
const { dashboardStats, recordVisit } = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
router.get("/stats", authMiddleware, adminMiddleware, dashboardStats);
router.post("/visit", recordVisit);

module.exports = router;
