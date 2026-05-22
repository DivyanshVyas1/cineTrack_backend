const Post = require("../models/Post");
const Follow = require("../models/Follow");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { attachFavoriteFlags } = require("./postFavoriteService");

const getFollowingIds = async (userId) => {
  if (!userId) return [];
  const rows = await Follow.find({ follower: userId }).select("following");
  return rows.map((r) => String(r.following));
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserPostForTitle = async (userId, type, title, externalId) => {
  const q = {
    user: userId,
    type,
    title: new RegExp(`^${escapeRegex(String(title).trim())}$`, "i"),
  };
  if (externalId?.trim()) q.externalId = externalId.trim();
  return Post.findOne(q);
};

const createPost = async (userId, body) => {
  const user = await User.findById(userId);
  const visibility = body.visibility || (user?.isPrivate ? "private" : "public");

  const duplicate = await findUserPostForTitle(
    userId,
    body.type,
    body.title,
    body.externalId
  );
  if (duplicate) {
    const err = new Error("You have already reviewed this title");
    err.statusCode = 409;
    throw err;
  }

  const postType = body.type;
  const genres = postType === "music" ? [] : body.genres || [];

  return Post.create({
    user: userId,
    type: postType,
    title: body.title?.trim(),
    externalId: body.externalId || "",
    artistName: body.artistName || "",
    previewUrl: body.previewUrl || "",
    youtubeVideoId: body.youtubeVideoId || body.videoId || "",
    youtubeUrl: body.youtubeUrl || "",
    duration: Number(body.duration) || 0,
    genres,
    poster: body.poster || "",
    rating: body.rating,
    note: body.note || "",
    isSpoiler: Boolean(body.isSpoiler),
    visibility,
  });
};

const getFeed = async (viewerId) => {
  const followingIds = await getFollowingIds(viewerId);

  const posts = await Post.find({ visibility: "public" })
    .populate("user", "name username avatar isPrivate")
    .sort({ createdAt: -1 })
    .limit(80);

  let isAdmin = false;
  if (viewerId) {
    const viewer = await User.findById(viewerId);
    if (viewer && viewer.role === "admin") isAdmin = true;
  }

  const filtered = posts.filter((item) => {
    if (!item.user?.isPrivate) return true;
    if (isAdmin) return true;
    return viewerId && String(item.user._id) === String(viewerId);
  });

  const postIds = filtered.map((p) => p._id);

  const [likeCounts, commentCounts, myLikes] = await Promise.all([
    Like.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
    Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
    viewerId ? Like.find({ user: viewerId, post: { $in: postIds } }).select("post") : [],
  ]);

  const likeMap = Object.fromEntries(likeCounts.map((l) => [String(l._id), l.count]));
  const commentMap = Object.fromEntries(commentCounts.map((c) => [String(c._id), c.count]));
  const myLikeSet = new Set(myLikes.map((l) => String(l.post)));

  const enriched = filtered.map((p) => {
    const authorId = String(p.user._id);
    const obj = p.toObject();
    return {
      ...obj,
      duration: p.duration,
      externalId: p.externalId,
      artistName: p.artistName,
      previewUrl: p.previewUrl,
      youtubeVideoId: p.youtubeVideoId,
      youtubeUrl: p.youtubeUrl,
      movie: {
        _id: p._id,
        title: p.title,
        poster: p.poster,
        backdrop: p.poster,
        type: p.type === "series" ? "show" : p.type,
        genres: p.genres,
        artistName: p.artistName,
        previewUrl: p.previewUrl,
        youtubeVideoId: p.youtubeVideoId,
        youtubeUrl: p.youtubeUrl,
        duration: p.duration,
        externalId: p.externalId,
      },
      likesCount: likeMap[String(p._id)] || 0,
      commentsCount: commentMap[String(p._id)] || 0,
      isLiked: myLikeSet.has(String(p._id)),
      isFollowing: followingIds.includes(authorId),
      isOwnPost: viewerId && authorId === String(viewerId),
    };
  });

  enriched.sort((a, b) => {
    const aFollow = followingIds.includes(String(a.user._id)) ? 1 : 0;
    const bFollow = followingIds.includes(String(b.user._id)) ? 1 : 0;
    if (aFollow !== bFollow) return bFollow - aFollow;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const slice = enriched.slice(0, 30);
  if (!viewerId) return slice;

  const ownPosts = slice.filter((p) => p.isOwnPost);
  if (!ownPosts.length) return slice;

  const flagged = await attachFavoriteFlags(viewerId, ownPosts);
  const flagMap = Object.fromEntries(flagged.map((p) => [String(p._id), p.isFavorite]));

  return slice.map((p) =>
    p.isOwnPost ? { ...p, isFavorite: Boolean(flagMap[String(p._id)]) } : p
  );
};

const assertOwner = (post, userId) => {
  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }
  if (String(post.user) !== String(userId)) {
    const err = new Error("You can only edit or delete your own posts");
    err.statusCode = 403;
    throw err;
  }
};

const updatePost = async (postId, userId, body) => {
  const post = await Post.findById(postId);
  assertOwner(post, userId);

  const updates = {};
  if (body.rating !== undefined) updates.rating = Number(body.rating);
  if (body.note !== undefined) updates.note = String(body.note);
  if (body.isSpoiler !== undefined) updates.isSpoiler = Boolean(body.isSpoiler);
  if (body.visibility !== undefined) updates.visibility = body.visibility;

  return Post.findByIdAndUpdate(postId, updates, { new: true }).populate(
    "user",
    "name username avatar"
  );
};

const deletePost = async (postId, userId) => {
  const post = await Post.findById(postId);
  assertOwner(post, userId);

  await Promise.all([Like.deleteMany({ post: postId }), Comment.deleteMany({ post: postId })]);
  await post.deleteOne();
  return { deleted: true };
};

module.exports = { createPost, getFeed, updatePost, deletePost, findUserPostForTitle };
