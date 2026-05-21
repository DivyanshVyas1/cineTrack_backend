const Post = require("../models/Post");

const mapPostTypeToDisplay = (postType) => {
  if (postType === "series") return "show";
  return postType;
};

const getTopRatedSongs = async (limit = 12) => {
  const rows = await Post.aggregate([
    { $match: { type: "music", visibility: "public" } },
    {
      $group: {
        _id: {
          title: "$title",
          externalId: "$externalId",
          poster: "$poster",
          artistName: "$artistName",
          duration: { $max: "$duration" },
        },
        avgRating: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
    { $match: { ratingCount: { $gte: 1 } } },
    { $sort: { avgRating: -1, ratingCount: -1 } },
    { $limit: limit },
    {
      $project: {
        avgRating: 1,
        ratingCount: 1,
        title: {
          title: "$_id.title",
          type: "music",
          poster: "$_id.poster",
          externalId: "$_id.externalId",
          artistName: "$_id.artistName",
          duration: "$_id.duration",
        },
      },
    },
  ]);

  return rows.map((row) => ({
    avgRating: Math.round(row.avgRating * 10) / 10,
    ratingCount: row.ratingCount,
    title: row.title,
  }));
};

const getTrendingByType = async (type, limit = 8) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return Post.aggregate([
    {
      $match: {
        type,
        visibility: "public",
        createdAt: { $gte: oneWeekAgo },
      },
    },
    {
      $group: {
        _id: {
          title: "$title",
          externalId: "$externalId",
          poster: "$poster",
          artistName: "$artistName",
        },
        watchedCount: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
    { $sort: { watchedCount: -1 } },
    { $limit: limit },
    {
      $project: {
        watchedCount: 1,
        avgRating: 1,
        title: {
          title: "$_id.title",
          type: mapPostTypeToDisplay(type),
          postType: type,
          poster: "$_id.poster",
          externalId: "$_id.externalId",
          artistName: "$_id.artistName",
        },
      },
    },
  ]);
};

module.exports = { getTopRatedSongs, getTrendingByType };
