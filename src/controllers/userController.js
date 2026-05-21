const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const userService = require("../services/userService");
const collectionService = require("../services/collectionService");
const { getTasteSuggestions } = require("../services/tasteMatchService");
const { successResponse } = require("../utils/responseFormatter");

const myProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  successResponse(res, user, "Profile fetched");
});

const getProfile = asyncHandler(async (req, res) => {
  const data = await userService.getProfileByUsername(req.params.username, req.user?.id);
  successResponse(res, data, "Profile fetched");
});

const getReviews = asyncHandler(async (req, res) => {
  const data = await userService.getUserReviews(req.params.username, req.user?.id);
  successResponse(res, data, "Reviews fetched");
});

const updatePrivacy = asyncHandler(async (req, res) => {
  const user = await userService.updatePrivacy(req.user.id, req.body.isPrivate);
  successResponse(res, user, "Privacy updated");
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, {
    bio: req.body.bio,
    avatar: req.body.avatar,
    characters: req.body.characters,
    ganduCharacters: req.body.ganduCharacters,
  });
  successResponse(res, user, "Profile updated");
});

const getCollection = asyncHandler(async (req, res) => {
  const data = await collectionService.getUserCollection({
    username: req.params.username,
    tab: req.query.tab || "movies",
    section: req.query.section || "all",
    viewerId: req.user?.id,
  });
  successResponse(res, data, "Collection fetched");
});

const addListItem = asyncHandler(async (req, res) => {
  const entry = await collectionService.addToList(req.user.id, req.body.movieId, req.body.listType);
  successResponse(res, entry, "Added to list", 201);
});

const rateUserTaste = asyncHandler(async (req, res) => {
  const profileUser = await User.findOne({ username: req.params.username });
  if (!profileUser) {
    res.status(404);
    throw new Error("User not found");
  }
  const rating = await collectionService.rateTaste({
    profileUserId: profileUser._id,
    raterId: req.user.id,
    mediaType: req.body.mediaType,
    score: req.body.score,
    comment: req.body.comment,
  });
  successResponse(res, rating, "Taste rating saved");
});

const getTasteMatchSuggestions = asyncHandler(async (req, res) => {
  const data = await getTasteSuggestions(req.user.id);
  successResponse(res, data, "Taste suggestions fetched");
});

module.exports = {
  myProfile,
  getProfile,
  getReviews,
  updatePrivacy,
  updateMyProfile,
  getCollection,
  addListItem,
  rateUserTaste,
  getTasteMatchSuggestions,
};
