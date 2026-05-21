const asyncHandler = require("../utils/asyncHandler");
const postService = require("../services/postService");
const { togglePostFavorite } = require("../services/postFavoriteService");
const { normalizeType } = require("../services/mediaSearchService");
const { successResponse } = require("../utils/responseFormatter");

const createPost = asyncHandler(async (req, res) => {
  const type = normalizeType(req.body.type);
  const post = await postService.createPost(req.user.id, { ...req.body, type });
  await post.populate("user", "name username avatar");
  successResponse(res, post, "Post created", 201);
});

const feed = asyncHandler(async (req, res) => {
  const data = await postService.getFeed(req.user?.id);
  successResponse(res, data, "Feed fetched");
});

const updatePost = asyncHandler(async (req, res) => {
  const post = await postService.updatePost(req.params.id, req.user.id, req.body);
  successResponse(res, post, "Post updated");
});

const deletePost = asyncHandler(async (req, res) => {
  const data = await postService.deletePost(req.params.id, req.user.id);
  successResponse(res, data, "Post deleted");
});

const favoritePost = asyncHandler(async (req, res) => {
  const data = await togglePostFavorite(req.params.id, req.user.id);
  successResponse(res, data, data.isFavorite ? "Added to favourites" : "Removed from favourites");
});

module.exports = { createPost, feed, updatePost, deletePost, favoritePost };
