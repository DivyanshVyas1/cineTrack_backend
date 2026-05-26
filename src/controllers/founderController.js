const asyncHandler = require("../utils/asyncHandler");
const FounderSuggestion = require("../models/FounderSuggestion");
const { successResponse } = require("../utils/responseFormatter");

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { jwtSecret } = require("../config/jwt");
const Post = require("../models/Post");
const User = require("../models/User");

const listFounderSuggestions = asyncHandler(async (req, res) => {
  let userId = null;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      userId = decoded.id;
    } catch (e) {}
  }

  let topGenre = null;
  if (userId) {
    const topGenreObj = await Post.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$genres" },
      { $group: { _id: "$genres", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    if (topGenreObj.length > 0) {
      topGenre = topGenreObj[0]._id;
    }
  }

  const adminUser = await User.findOne({ email: "admin@cinetrack.com" });
  const adminId = adminUser ? adminUser._id : null;

  let suggestions = [];
  let matchedGenreTitle = null;

  if (adminId) {
    if (topGenre) {
      // Find admin's posts in this genre with rating > 8.5
      const adminGenrePosts = await Post.find({
        user: adminId,
        type: { $in: ["show", "series"] },
        genres: topGenre,
        rating: { $gt: 8.5 }
      }).sort({ rating: -1 }).limit(2);

      if (adminGenrePosts.length > 0) {
        suggestions = adminGenrePosts;
        matchedGenreTitle = topGenre;
      }
    }

    if (suggestions.length === 0) {
      // Fallback: Admin's overall top rated shows
      suggestions = await Post.find({
        user: adminId,
        type: { $in: ["show", "series"] }
      }).sort({ rating: -1 }).limit(2);
      matchedGenreTitle = "Top Rated";
    }
  } else {
    // If no admin found, just return active founder suggestions (fallback)
    const items = await FounderSuggestion.find({ active: true }).populate("movie").limit(2);
    suggestions = items.map(item => ({
      _id: item._id,
      title: item.movie.title,
      poster: item.movie.poster,
      note: item.note,
      rating: 0
    }));
  }

  // Format the suggestions so the frontend can consume them easily
  const formattedItems = suggestions.map(post => {
    // If it's a Post model
    if (post.title) {
      return {
        _id: post._id,
        movie: {
          title: post.title,
          poster: post.poster,
          type: post.type,
          externalId: post.externalId
        },
        note: post.note || `Rated ${post.rating}/10 by founder`,
        rating: post.rating
      };
    }
    return post;
  });

  // Ensure exactly 2 items if possible
  const result = {
    matchedGenre: matchedGenreTitle,
    items: formattedItems.slice(0, 2)
  };

  successResponse(res, result, "Founder suggestions fetched");
});

module.exports = { listFounderSuggestions };
