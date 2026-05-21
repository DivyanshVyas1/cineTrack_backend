const asyncHandler = require("../utils/asyncHandler");
const Movie = require("../models/Movie");
const User = require("../models/User");
const { searchSuggestions } = require("../services/searchService");
const { successResponse } = require("../utils/responseFormatter");

const globalSearch = asyncHandler(async (req, res) => {
  const q = req.query.q || "";
  const [movies, users] = await Promise.all([
    Movie.find({ title: { $regex: q, $options: "i" } }).limit(8),
    User.find({ username: { $regex: q, $options: "i" } }).select("username name avatar").limit(8),
  ]);
  successResponse(res, { movies, users }, "Search results fetched");
});

const searchUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) {
    successResponse(res, [], "Users fetched");
    return;
  }
  const users = await User.find({ username: { $regex: q, $options: "i" } })
    .select("username name avatar bio")
    .limit(20);
  successResponse(res, users, "Users fetched");
});

const mediaSearch = asyncHandler(async (req, res) => {
  const { query, type } = req.query;
  const q = (query || req.query.q || "").trim();
  const results = await searchSuggestions(q, type || "movie");
  successResponse(res, results, "Suggestions fetched");
});

module.exports = { globalSearch, searchUsers, mediaSearch };
