const Movie = require("../models/Movie");
const Post = require("../models/Post");
const buildPagination = require("../utils/pagination");

const listMovies = async ({ page, limit, search, type }) => {
  const { skip, limit: parsedLimit } = buildPagination(page, limit);
  const query = {};
  if (type) query.type = type;
  if (search?.trim()) query.title = { $regex: search.trim(), $options: "i" };
  const [items, total] = await Promise.all([
    Movie.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
    Movie.countDocuments(query),
  ]);
  return { items, total };
};

const getTrendingWeek = async () => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return Post.aggregate([
    { $match: { createdAt: { $gte: oneWeekAgo }, visibility: "public" } },
    {
      $group: {
        _id: { title: "$title", type: "$type", poster: "$poster", externalId: "$externalId" },
        watchedCount: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
    { $sort: { watchedCount: -1 } },
    { $limit: 10 },
    {
      $project: {
        watchedCount: 1,
        avgRating: 1,
        title: {
          title: "$_id.title",
          poster: "$_id.poster",
          externalId: "$_id.externalId",
          type: {
            $cond: [{ $eq: ["$_id.type", "series"] }, "show", "$_id.type"],
          },
          postType: "$_id.type",
        },
      },
    },
  ]);
};

module.exports = { listMovies, getTrendingWeek };
