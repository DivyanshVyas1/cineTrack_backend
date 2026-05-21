const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Review = require("../models/Review");
const Movie = require("../models/Movie");
const { successResponse } = require("../utils/responseFormatter");

const dashboardStats = asyncHandler(async (_req, res) => {
  const [users, reviews, movies] = await Promise.all([
    User.countDocuments(),
    Review.countDocuments(),
    Movie.countDocuments(),
  ]);
  successResponse(res, { users, reviews, movies }, "Admin analytics fetched");
});

module.exports = { dashboardStats };
