const Post = require("../models/Post");
const TasteRating = require("../models/TasteRating");
const User = require("../models/User");

/** Average score other users gave this profile (taste reviews). */
const getCommunityAverageRating = async (userId) => {
  const [row] = await TasteRating.aggregate([
    { $match: { profileUser: userId } },
    { $group: { _id: null, avg: { $avg: "$score" }, count: { $sum: 1 } } },
  ]);

  if (!row?.count) {
    return { averageRating: null, ratingsCount: 0 };
  }

  return {
    averageRating: Math.round(row.avg * 10) / 10,
    ratingsCount: row.count,
  };
};

/** Average of all ratings the user gave (movies, web shows, books). */
const getUserAverageRating = async (userId) => {
  const [row] = await Post.aggregate([
    { $match: { user: userId } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  if (!row?.count) {
    return { averageRating: null, ratingsCount: 0 };
  }

  return {
    averageRating: Math.round(row.avg * 10) / 10,
    ratingsCount: row.count,
  };
};

const syncUserAverageRating = async (userId) => {
  const { averageRating } = await getUserAverageRating(userId);
  await User.findByIdAndUpdate(userId, { tasteScore: averageRating ?? 0 });
  return averageRating;
};

const syncCommunityAverageRating = async (userId) => {
  const { averageRating } = await getCommunityAverageRating(userId);
  await User.findByIdAndUpdate(userId, { tasteScore: averageRating ?? 0 });
  return averageRating;
};

module.exports = {
  getCommunityAverageRating,
  getUserAverageRating,
  syncUserAverageRating,
  syncCommunityAverageRating,
};
