const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Review = require("../models/Review");
const Movie = require("../models/Movie");
const { successResponse } = require("../utils/responseFormatter");

const Post = require("../models/Post");
const SiteStats = require("../models/SiteStats");

const DailyAnalytics = require("../models/DailyAnalytics");
const { getTodayString } = require("../services/analyticsService");

const dashboardStats = asyncHandler(async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayStr = getTodayString();

  const [
    users,
    reviews,
    posts,
    newUsersToday,
    statsDoc,
    dauCount,
    todayAnalytics,
    globalAnalytics,
    mediaSplit,
    achievementsBreakdown
  ] = await Promise.all([
    User.countDocuments(),
    Review.countDocuments(),
    Post.countDocuments(),
    User.countDocuments({ createdAt: { $gte: startOfDay } }),
    SiteStats.findOne(),
    User.countDocuments({ lastActiveAt: { $gte: startOfDay } }),
    DailyAnalytics.findOne({ date: todayStr }),
    DailyAnalytics.aggregate([
      { $group: { _id: null, tasteMatches: { $sum: "$tasteMatches" } } }
    ]),
    Post.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]),
    User.aggregate([
      { $unwind: "$achievements" },
      { $group: { 
          _id: "$achievements.badgeId", 
          count: { $sum: 1 },
          users: { $push: "$username" }
      } }
    ])
  ]);

  const visits = statsDoc ? statsDoc.visits : 0;
  
  const formattedMediaSplit = mediaSplit.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const formattedAchievements = achievementsBreakdown.reduce((acc, curr) => {
    acc[curr._id] = { count: curr.count, users: curr.users };
    return acc;
  }, {});

  const advancedStats = {
    dau: dauCount,
    apiCallsTmdb: todayAnalytics?.apiCallsTmdb || 0,
    apiCallsYoutube: todayAnalytics?.apiCallsYoutube || 0,
    totalTasteMatches: globalAnalytics[0]?.tasteMatches || 0,
    mediaSplit: formattedMediaSplit,
    achievements: formattedAchievements
  };

  successResponse(res, { users, reviews, posts, newUsersToday, visits, ...advancedStats }, "Admin analytics fetched");
});

const recordVisit = asyncHandler(async (req, res) => {
  const stats = await SiteStats.findOneAndUpdate({}, { $inc: { visits: 1 } }, { upsert: true, new: true });
  successResponse(res, { visits: stats.visits }, "Visit recorded");
});

module.exports = { dashboardStats, recordVisit };
