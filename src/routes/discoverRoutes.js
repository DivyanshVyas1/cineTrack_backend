const express = require("express");
const {
  trendingCharacters,
  topRatedSongs,
  discoverSummary,
} = require("../controllers/discoverController");

const router = express.Router();
router.get("/summary", discoverSummary);
router.get("/trending-characters", trendingCharacters);
router.get("/top-rated-songs", topRatedSongs);

module.exports = router;
