const express = require("express");
const {
  myProfile,
  getProfile,
  getReviews,
  updatePrivacy,
  updateMyProfile,
  getCollection,
  addListItem,
  rateUserTaste,
  getTasteMatchSuggestions,
} = require("../controllers/userController");
const {
  follow,
  unfollow,
  removeFollower,
  followStatus,
  getFollowers,
  getFollowing,
  updateCharacters,
  cancelFollowRequest,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  toggleLike,
} = require("../controllers/socialController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

const router = express.Router();
router.get("/me", authMiddleware, myProfile);
router.get("/suggestions/taste", authMiddleware, getTasteMatchSuggestions);
router.patch("/me/privacy", authMiddleware, updatePrivacy);
router.patch("/me/profile", authMiddleware, updateMyProfile);
router.patch("/me/characters", authMiddleware, updateCharacters);
router.post("/me/list", authMiddleware, addListItem);
router.get("/me/follow-requests", authMiddleware, getFollowRequests);
router.post("/me/follow-requests/:id/accept", authMiddleware, acceptFollowRequest);
router.delete("/me/follow-requests/:id", authMiddleware, rejectFollowRequest);
router.post("/:username/follow", authMiddleware, follow);
router.delete("/:username/follow", authMiddleware, unfollow);
router.delete("/me/followers/:username", authMiddleware, removeFollower);
router.delete("/:username/follow-request", authMiddleware, cancelFollowRequest);
router.get("/:username/follow-status", authMiddleware, followStatus);
router.get("/:username/followers", optionalAuthMiddleware, getFollowers);
router.get("/:username/following", optionalAuthMiddleware, getFollowing);
router.get("/:username/collection", optionalAuthMiddleware, getCollection);
router.post("/:username/taste", authMiddleware, rateUserTaste);
router.post("/:id/like", authMiddleware, toggleLike);
router.get("/:username/reviews", optionalAuthMiddleware, getReviews);
router.get("/:username", optionalAuthMiddleware, getProfile);

module.exports = router;
