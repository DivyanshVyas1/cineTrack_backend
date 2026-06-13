const Post = require("../models/Post");
const Follow = require("../models/Follow");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Movie = require("../models/Movie");
const UserListEntry = require("../models/UserListEntry");
const { attachFavoriteFlags } = require("./postFavoriteService");
const TasteRating = require("../models/TasteRating");
const { computeGenreStats } = require("./genreStatsService");
const { getMediaDuration } = require("./mediaSearchService");
const { updateTopBadges } = require("./achievementService");

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

  let duration = Number(body.duration) || 0;
  if (duration === 0 && (postType === "movie" || postType === "series" || postType === "show") && body.externalId) {
    duration = await getMediaDuration(body.externalId, postType);
  }

  return Post.create({
    user: userId,
    type: postType,
    title: body.title?.trim(),
    externalId: body.externalId || "",
    artistName: body.artistName || "",
    previewUrl: body.previewUrl || "",
    youtubeVideoId: body.youtubeVideoId || body.videoId || "",
    youtubeUrl: body.youtubeUrl || "",
    duration,
    genres,
    poster: body.poster || "",
    rating: body.rating,
    note: body.note || "",
    isSpoiler: Boolean(body.isSpoiler),
    visibility,
  });

  try {
    const listMovieType = postType === "series" ? "show" : postType;
    const movie = await Movie.findOne({ title: body.title?.trim(), type: listMovieType });
    if (movie) {
      const deletedEntry = await UserListEntry.findOneAndDelete({
        user: userId,
        movie: movie._id,
        listType: "watchlist"
      });
      if (deletedEntry) {
        await User.findByIdAndUpdate(userId, { $inc: { watchlistCompletions: 1 } });
      }
    }
  } catch (err) {
    console.error("Watchlist completion tracking error:", err);
  }

  return post;
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
    .populate("user", "name username avatar isPrivate topBadges")
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

  // Fetch likes for these users (profile likes), taste ratings, and aggregations for stats
  const [likeCounts, myLikes, tasteAgs, watchTimeAgg, genreAgg] = await Promise.all([
    Like.aggregate([
      { $match: { targetUser: { $in: userIds } } },
      { $group: { _id: "$targetUser", count: { $sum: 1 } } },
    ]),
    viewerId ? Like.find({ user: viewerId, targetUser: { $in: userIds } }).select("targetUser") : [],
    TasteRating.aggregate([
      { $match: { profileUser: { $in: userIds } } },
      { $group: { _id: "$profileUser", avg: { $avg: "$score" }, count: { $sum: 1 } } }
    ]),
    Post.aggregate([
      { $match: { user: { $in: userIds }, type: { $in: ["movie", "series", "show"] } } },
      { $group: { _id: "$user", watchTime: { $sum: "$duration" } } }
    ]),
    Post.aggregate([
      { $match: { user: { $in: userIds } } },
      { $unwind: "$genres" },
      { $group: { _id: { user: "$user", genre: "$genres" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $group: { _id: "$_id.user", topGenres: { $push: "$_id.genre" } } }
    ])
  ]);

  const likeMap = Object.fromEntries(likeCounts.map((l) => [String(l._id), l.count]));
  const myLikeSet = new Set(myLikes.map((l) => String(l.targetUser)));
  const tasteMap = Object.fromEntries(tasteAgs.map((t) => [String(t._id), { avg: t.avg, count: t.count }]));
  const watchTimeMap = Object.fromEntries(watchTimeAgg.map((w) => [String(w._id), w.watchTime]));
  const genreMap = Object.fromEntries(genreAgg.map((g) => [String(g._id), g.topGenres]));

  const formatWatchTime = (minutes) => {
    if (!minutes || isNaN(minutes) || minutes === 0) return "0m";
    const m = Math.floor(minutes);
    const days = Math.floor(m / (24 * 60));
    const hours = Math.floor((m % (24 * 60)) / 60);
    const remainingMinutes = m % 60;
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${remainingMinutes}m`;
    return `${remainingMinutes}m`;
  };

  const enriched = grouped.map((group) => {
    const authorId = String(group.user._id);
    
    const watchTimeMinutes = watchTimeMap[authorId] || 0;
    
    const subtitle = `Completed ${formatWatchTime(watchTimeMinutes)} of watchtime`;

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
      topGenres: (genreMap[authorId] || []).slice(0, 3),
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

  const updatedPost = await Post.findByIdAndUpdate(postId, updates, { new: true }).populate(
    "user",
    "name username avatar isPrivate topBadges"
  );
  updateTopBadges(userId).catch(console.error);
  return updatedPost;
};

const deletePost = async (postId, userId) => {
  const post = await Post.findById(postId);
  assertOwner(post, userId);

  await Promise.all([Like.deleteMany({ post: postId }), Comment.deleteMany({ post: postId })]);
  await post.deleteOne();
  updateTopBadges(userId).catch(console.error);
  return { deleted: true };
};

module.exports = { createPost, getFeed, updatePost, deletePost, findUserPostForTitle };
