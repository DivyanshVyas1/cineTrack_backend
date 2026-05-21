const express = require("express");
const { listFounderSuggestions } = require("../controllers/founderController");

const router = express.Router();
router.get("/", listFounderSuggestions);

module.exports = router;
