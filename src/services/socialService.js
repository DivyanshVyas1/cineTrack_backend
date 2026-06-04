const Follow = require("../models/Follow");
const FollowRequest = require("../models/FollowRequest");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const User = require("../models/User");

const canViewPrivateUserContent = async (viewerId, profileUserId) => {
  if (!viewerId) return false;
  if (String(viewerId) === String(profileUserId)) return true;
  
  const viewer = await User.findById(viewerId);
  if (viewer && viewer.role === "admin") return true;

  const following = await Follow.exists({ follower: viewerId, following: profileUserId });
  return Boolean(following);
};

const toggleLike = async (targetUserId, userId) => {
  const existing = await Like.findOne({ targetUser: targetUserId, user: userId });

  if (existing) {
    await existing.deleteOne();
    const count = await Like.countDocuments({ targetUser: targetUserId });
    return { liked: false, likesCount: count };
  }

  // Get count BEFORE inserting so we can add 1 deterministically
  const countBefore = await Like.countDocuments({ targetUser: targetUserId });

  try {
    await Like.create({ targetUser: targetUserId, user: userId });
    return { liked: true, likesCount: countBefore + 1 };
  } catch (dupErr) {
    // Race condition: already liked by a concurrent request
    if (dupErr.code !== 11000) throw dupErr;
    return { liked: true, likesCount: countBefore };
  }
};

const getLikes = async (targetUserId) => {
  return Like.find({ targetUser: targetUserId })
    .read("primary")
    .populate("user", "name username avatar")
    .sort({ createdAt: -1 });
};

const addComment = async (postId, userId, text) => {
  const comment = await Comment.create({ post: postId, user: userId, text });
  await comment.populate("user", "name username avatar");
  return comment;
};

const getComments = async (postId) => {
  return Comment.find({ post: postId })
    .populate("user", "name username avatar")
    .sort({ createdAt: -1 });
};

const followUser = async (followerId, targetUsername) => {
  const target = await User.findOne({ username: targetUsername });
  if (!target) throw new Error("User not found");
  if (String(target._id) === String(followerId)) throw new Error("You cannot follow yourself");

  const already = await Follow.exists({ follower: followerId, following: target._id });
  if (already) return { following: true, requestPending: false };

  if (target.isPrivate) {
    const pending = await FollowRequest.findOne({
      requester: followerId,
      target: target._id,
      status: "pending",
    });
    if (pending) return { following: false, requestPending: true };

    await FollowRequest.findOneAndUpdate(
      { requester: followerId, target: target._id },
      { requester: followerId, target: target._id, status: "pending" },
      { upsert: true, new: true }
    );
    return { following: false, requestPending: true };
  }

  await Follow.findOneAndUpdate(
    { follower: followerId, following: target._id },
    { follower: followerId, following: target._id },
    { upsert: true, new: true }
  );
  await FollowRequest.deleteMany({ requester: followerId, target: target._id });
  return { following: true, requestPending: false };
};

const unfollowUser = async (followerId, targetUsername) => {
  const target = await User.findOne({ username: targetUsername });
  if (!target) throw new Error("User not found");
  await Follow.deleteOne({ follower: followerId, following: target._id });
  await FollowRequest.deleteMany({ requester: followerId, target: target._id });
  return { following: false, requestPending: false };
};

const cancelFollowRequest = async (followerId, targetUsername) => {
  const target = await User.findOne({ username: targetUsername });
  if (!target) throw new Error("User not found");
  await FollowRequest.deleteMany({ requester: followerId, target: target._id, status: "pending" });
  return { requestPending: false };
};

const getFollowStatus = async (followerId, targetUsername) => {
  const target = await User.findOne({ username: targetUsername });
  if (!target) throw new Error("User not found");
  const following = followerId
    ? await Follow.exists({ follower: followerId, following: target._id })
    : null;
  const requestPending = followerId
    ? await FollowRequest.exists({
        requester: followerId,
        target: target._id,
        status: "pending",
      })
    : null;
  const [followersCount, followingCount] = await Promise.all([
    Follow.countDocuments({ following: target._id }),
    Follow.countDocuments({ follower: target._id }),
  ]);
  return {
    isFollowing: Boolean(following),
    requestPending: Boolean(requestPending),
    followersCount,
    followingCount,
  };
};

const getIncomingFollowRequests = async (userId) =>
  FollowRequest.find({ target: userId, status: "pending" })
    .populate("requester", "name username avatar")
    .sort({ createdAt: -1 });

const respondFollowRequest = async (userId, requestId, accept) => {
  const req = await FollowRequest.findOne({ _id: requestId, target: userId, status: "pending" });
  if (!req) throw new Error("Follow request not found");

  if (!accept) {
    req.status = "rejected";
    await req.save();
    return { accepted: false };
  }

  await Follow.findOneAndUpdate(
    { follower: req.requester, following: req.target },
    { follower: req.requester, following: req.target },
    { upsert: true, new: true }
  );
  await req.deleteOne();
  return { accepted: true };
};

const getSocialStats = async (userId) => {
  const [followersCount, followingCount] = await Promise.all([
    Follow.countDocuments({ following: userId }),
    Follow.countDocuments({ follower: userId }),
  ]);
  return { followersCount, followingCount };
};

const getFollowList = async (username, type, viewerId) => {
  const user = await User.findOne({ username });
  if (!user) throw new Error("User not found");

  const isOwner = viewerId && String(user._id) === String(viewerId);
  if (user.isPrivate && !isOwner) {
    const allowed = await canViewPrivateUserContent(viewerId, user._id);
    if (!allowed) throw new Error("This profile is private");
  }

  const isFollowers = type === "followers";
  const rows = await Follow.find(isFollowers ? { following: user._id } : { follower: user._id })
    .populate(isFollowers ? "follower" : "following", "name username avatar")
    .sort({ createdAt: -1 })
    .limit(100);

  return rows.map((row) => (isFollowers ? row.follower : row.following)).filter(Boolean);
};

const updateFavoriteCharacters = async (userId, characters) => {
  if (!Array.isArray(characters) || characters.length > 3) {
    throw new Error("You can add at most 3 favorite characters");
  }
  const cleaned = characters
    .filter((c) => c?.name?.trim())
    .slice(0, 3)
    .map((c) => ({ name: c.name.trim(), source: (c.source || "").trim() }));
  return User.findByIdAndUpdate(userId, { favoriteCharacters: cleaned }, { new: true }).select(
    "-password"
  );
};

module.exports = {
  toggleLike,
  getLikes,
  addComment,
  getComments,
  followUser,
  unfollowUser,
  cancelFollowRequest,
  getFollowStatus,
  getSocialStats,
  getFollowList,
  updateFavoriteCharacters,
  canViewPrivateUserContent,
  getIncomingFollowRequests,
  respondFollowRequest,
};
