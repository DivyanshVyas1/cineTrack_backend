const express = require("express");
const { dashboardStats } = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
router.get("/stats", authMiddleware, adminMiddleware, dashboardStats);

module.exports = router;
