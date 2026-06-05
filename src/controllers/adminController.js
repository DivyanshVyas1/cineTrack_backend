const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Review = require("../models/Review");
const Movie = require("../models/Movie");
const { successResponse } = require("../utils/responseFormatter");

const Post = require("../models/Post");
const SiteStats = require("../models/SiteStats");

const dashboardStats = asyncHandler(async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [users, reviews, posts, newUsersToday, statsDoc] = await Promise.all([
    User.countDocuments(),
    Review.countDocuments(),
    Post.countDocuments(),
    User.countDocuments({ createdAt: { $gte: startOfDay } }),
    SiteStats.findOne()
  ]);
  const visits = statsDoc ? statsDoc.visits : 0;
  successResponse(res, { users, reviews, posts, newUsersToday, visits }, "Admin analytics fetched");
});

const recordVisit = asyncHandler(async (req, res) => {
  const stats = await SiteStats.findOneAndUpdate({}, { $inc: { visits: 1 } }, { upsert: true, new: true });
  successResponse(res, { visits: stats.visits }, "Visit recorded");
});

module.exports = { dashboardStats, recordVisit };
