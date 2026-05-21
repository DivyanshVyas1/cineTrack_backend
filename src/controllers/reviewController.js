const asyncHandler = require("../utils/asyncHandler");
const postService = require("../services/postService");
const { normalizeType } = require("../services/mediaSearchService");
const { successResponse } = require("../utils/responseFormatter");

const createReview = asyncHandler(async (req, res) => {
  const type = normalizeType(req.body.type);
  const post = await postService.createPost(req.user.id, {
    type,
    title: req.body.title,
    externalId: req.body.externalId,
    genres: req.body.genres,
    poster: req.body.poster,
    rating: req.body.rating,
    note: req.body.note,
    isSpoiler: req.body.isSpoiler,
    visibility: req.body.visibility,
  });
  successResponse(res, post, "Post created", 201);
});

const feed = asyncHandler(async (req, res) => {
  const data = await postService.getFeed(req.user?.id);
  successResponse(res, data, "Feed fetched");
});

module.exports = { createReview, feed };
