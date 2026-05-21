const express = require("express");
const { streamPreview, previewInfo } = require("../controllers/musicController");

const router = express.Router();

router.get("/preview/:videoId", streamPreview);
router.get("/preview/:videoId/info", previewInfo);

module.exports = router;
