const asyncHandler = require("../utils/asyncHandler");
const socialService = require("../services/socialService");
const { successResponse } = require("../utils/responseFormatter");

const toggleLike = asyncHandler(async (req, res) => {
  const data = await socialService.toggleLike(req.params.id, req.user.id);
  successResponse(res, data, data.liked ? "Liked" : "Unliked");
});

const getLikes = asyncHandler(async (req, res) => {
  const data = await socialService.getLikes(req.params.id);
  successResponse(res, data, "Likes fetched");
});

const addComment = asyncHandler(async (req, res) => {
  const data = await socialService.addComment(req.params.id, req.user.id, req.body.text);
  successResponse(res, data, "Comment added", 201);
});

const getComments = asyncHandler(async (req, res) => {
  const data = await socialService.getComments(req.params.id);
  successResponse(res, data, "Comments fetched");
});

const follow = asyncHandler(async (req, res) => {
  const data = await socialService.followUser(req.user.id, req.params.username);
  const msg = data.requestPending ? "Follow request sent" : "Followed";
  successResponse(res, data, msg);
});

const unfollow = asyncHandler(async (req, res) => {
  const data = await socialService.unfollowUser(req.user.id, req.params.username);
  successResponse(res, data, "Unfollowed");
});

const removeFollower = asyncHandler(async (req, res) => {
  const data = await socialService.removeFollower(req.user.id, req.params.username);
  successResponse(res, data, "Follower removed");
});

const followStatus = asyncHandler(async (req, res) => {
  const data = await socialService.getFollowStatus(req.user.id, req.params.username);
  successResponse(res, data, "Follow status fetched");
});

const updateCharacters = asyncHandler(async (req, res) => {
  const data = await socialService.updateFavoriteCharacters(req.user.id, req.body.characters);
  successResponse(res, data, "Characters updated");
});

const getFollowers = asyncHandler(async (req, res) => {
  const data = await socialService.getFollowList(req.params.username, "followers", req.user?.id);
  successResponse(res, data, "Followers fetched");
});

const getFollowing = asyncHandler(async (req, res) => {
  const data = await socialService.getFollowList(req.params.username, "following", req.user?.id);
  successResponse(res, data, "Following fetched");
});

const cancelFollowRequest = asyncHandler(async (req, res) => {
  const data = await socialService.cancelFollowRequest(req.user.id, req.params.username);
  successResponse(res, data, "Request cancelled");
});

const getFollowRequests = asyncHandler(async (req, res) => {
  const data = await socialService.getIncomingFollowRequests(req.user.id);
  successResponse(res, data, "Follow requests fetched");
});

const acceptFollowRequest = asyncHandler(async (req, res) => {
  const data = await socialService.respondFollowRequest(req.user.id, req.params.id, true);
  successResponse(res, data, "Follow request accepted");
});

const rejectFollowRequest = asyncHandler(async (req, res) => {
  const data = await socialService.respondFollowRequest(req.user.id, req.params.id, false);
  successResponse(res, data, "Follow request rejected");
});

module.exports = {
  toggleLike,
  getLikes,
  addComment,
  getComments,
  follow,
  unfollow,
  removeFollower,
  cancelFollowRequest,
  followStatus,
  getFollowers,
  getFollowing,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  updateCharacters,
};
