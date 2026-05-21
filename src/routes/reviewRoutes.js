const express = require("express");
const { feed, createReview } = require("../controllers/reviewController");
const {
  toggleLike,
  getLikes,
  addComment,
  getComments,
} = require("../controllers/socialController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

const router = express.Router();
router.get("/feed", optionalAuthMiddleware, feed);
router.post("/", authMiddleware, createReview);
router.post("/:id/like", authMiddleware, toggleLike);
router.get("/:id/likes", optionalAuthMiddleware, getLikes);
router.post("/:id/comments", authMiddleware, addComment);
router.get("/:id/comments", optionalAuthMiddleware, getComments);

module.exports = router;
