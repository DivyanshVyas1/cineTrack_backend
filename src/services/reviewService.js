const Review = require("../models/Review");
const { syncUserAverageRating } = require("./ratingStatsService");

const createReview = async ({ userId, movie, rating, note, isSpoiler, watchedOn }) => {
  const review = await Review.create({ user: userId, movie, rating, note, isSpoiler, watchedOn });
  await review.populate("movie");
  await review.populate("user", "name username avatar isPrivate tasteScore");
  await syncUserAverageRating(review.user);
  return review;
};

module.exports = { createReview };
