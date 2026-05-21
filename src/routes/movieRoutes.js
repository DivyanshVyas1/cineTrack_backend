const express = require("express");
const {
  createMovie,
  listMovies,
  trendingWeek,
  getMovie,
  getMovieReviews,
  searchSuggestions,
} = require("../controllers/movieController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

const router = express.Router();
router.get("/", listMovies);
router.get("/suggestions", searchSuggestions);
router.get("/trending/week", trendingWeek);
router.get("/:id/reviews", optionalAuthMiddleware, getMovieReviews);
router.get("/:id", getMovie);
router.post("/", authMiddleware, createMovie);

module.exports = router;
