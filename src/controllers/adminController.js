const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Review = require("../models/Review");
const Movie = require("../models/Movie");
const { successResponse } = require("../utils/responseFormatter");

const Post = require("../models/Post");

const dashboardStats = asyncHandler(async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [users, reviews, posts, newUsersToday] = await Promise.all([
    User.countDocuments(),
    Review.countDocuments(),
    Post.countDocuments(),
    User.countDocuments({ createdAt: { $gte: startOfDay } }),
  ]);
  successResponse(res, { users, reviews, posts, newUsersToday }, "Admin analytics fetched");
});

module.exports = { dashboardStats };
