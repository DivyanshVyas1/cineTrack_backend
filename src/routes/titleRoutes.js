const express = require("express");
const { getDetail } = require("../controllers/titleController");

const router = express.Router();
router.get("/detail", getDetail);

module.exports = router;
