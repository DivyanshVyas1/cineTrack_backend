const Post = require("../models/Post");
const Follow = require("../models/Follow");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { attachFavoriteFlags } = require("./postFavoriteService");
const TasteRating = require("../models/TasteRating");
const { computeGenreStats } = require("./genreStatsService");

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

  let postQuery = { visibility: "public" };
  if (viewerId) {
    postQuery = {
      $or: [
        { visibility: "public" },
        { user: { $in: followingIds } },
        { user: viewerId }
      ]
    };
  }

  const posts = await Post.find(postQuery)
    .populate("user", "name username avatar isPrivate")
    .sort({ createdAt: -1 })
    .limit(200);

  let isAdmin = false;
  if (viewerId) {
    const viewer = await User.findById(viewerId);
    if (viewer && viewer.role === "admin") isAdmin = true;
  }

  const filtered = posts.filter((item) => {
    if (!item.user?.isPrivate) return true;
    if (isAdmin) return true;
    const authorId = String(item.user._id);
    if (viewerId && authorId === String(viewerId)) return true;
    if (viewerId && followingIds.includes(authorId)) return true;
    return false;
  });

  // Group by user
  const userMap = new Map();
  for (const p of filtered) {
    const authorId = String(p.user._id);
    if (!userMap.has(authorId)) {
      userMap.set(authorId, {
        user: p.user,
        posts: [],
      });
    }
    if (userMap.get(authorId).posts.length < 15) {
      userMap.get(authorId).posts.push(p);
    }
  }

  const grouped = Array.from(userMap.values());
  const userIds = grouped.map((g) => g.user._id);

  // Fetch likes for these users (profile likes), taste ratings, and all posts for genre stats
  const [likeCounts, myLikes, tasteAgs, allUserPosts] = await Promise.all([
    Like.aggregate([
      { $match: { targetUser: { $in: userIds } } },
      { $group: { _id: "$targetUser", count: { $sum: 1 } } },
    ]),
    viewerId ? Like.find({ user: viewerId, targetUser: { $in: userIds } }).select("targetUser") : [],
    TasteRating.aggregate([
      { $match: { profileUser: { $in: userIds } } },
      { $group: { _id: "$profileUser", avg: { $avg: "$score" }, count: { $sum: 1 } } }
    ]),
    Post.find({ user: { $in: userIds } }).select("user genres rating")
  ]);

  const likeMap = Object.fromEntries(likeCounts.map((l) => [String(l._id), l.count]));
  const myLikeSet = new Set(myLikes.map((l) => String(l.targetUser)));
  const tasteMap = Object.fromEntries(tasteAgs.map((t) => [String(t._id), { avg: t.avg, count: t.count }]));

  const userPostsMap = {};
  for (const p of allUserPosts) {
    const uid = String(p.user);
    if (!userPostsMap[uid]) userPostsMap[uid] = [];
    userPostsMap[uid].push(p);
  }

  const enriched = grouped.map((group) => {
    const authorId = String(group.user._id);
    const count = group.posts.length;
    const subtitle = `Rated ${count} title${count > 1 ? 's' : ''} recently`;

    return {
      _id: authorId,
      user: group.user,
      subtitle,
      posts: group.posts.map(p => ({
        _id: p._id,
        title: p.title,
        poster: p.poster,
        rating: p.rating,
        type: p.type === "series" ? "show" : p.type,
        externalId: p.externalId,
        createdAt: p.createdAt,
        previewUrl: p.type === "music" ? p.previewUrl : undefined,
        artistName: p.type === "music" ? p.artistName : undefined,
        duration: p.type === "music" ? p.duration : undefined,
        youtubeVideoId: p.type === "music" ? p.youtubeVideoId : undefined,
      })),
      likesCount: likeMap[authorId] || 0,
      isLiked: myLikeSet.has(authorId),
      isFollowing: followingIds.includes(authorId),
      isOwnProfile: viewerId && authorId === String(viewerId),
      latestPostDate: group.posts[0].createdAt,
      communityRating: tasteMap[authorId] ? Number(tasteMap[authorId].avg.toFixed(1)) : null,
      communityRatingCount: tasteMap[authorId] ? tasteMap[authorId].count : 0,
      topGenres: computeGenreStats(userPostsMap[authorId] || []).slice(0, 3).map(g => g.genre),
    };
  });

  enriched.sort((a, b) => {
    const aFollow = a.isFollowing ? 1 : 0;
    const bFollow = b.isFollowing ? 1 : 0;
    if (aFollow !== bFollow) return bFollow - aFollow;
    return new Date(b.latestPostDate) - new Date(a.latestPostDate);
  });

  return enriched.slice(0, 30);
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
