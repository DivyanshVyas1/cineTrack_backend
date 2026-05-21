const express = require("express");
const { createPost, feed, updatePost, deletePost, favoritePost } = require("../controllers/postController");
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
router.post("/", authMiddleware, createPost);
router.patch("/:id", authMiddleware, updatePost);
router.delete("/:id", authMiddleware, deletePost);
router.post("/:id/favorite", authMiddleware, favoritePost);
router.post("/:id/like", authMiddleware, toggleLike);
router.get("/:id/likes", optionalAuthMiddleware, getLikes);
router.post("/:id/comments", authMiddleware, addComment);
router.get("/:id/comments", optionalAuthMiddleware, getComments);

module.exports = router;
