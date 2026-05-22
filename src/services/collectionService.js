const Post = require("../models/Post");
const UserListEntry = require("../models/UserListEntry");
const TasteRating = require("../models/TasteRating");
const User = require("../models/User");
const { syncCommunityAverageRating } = require("./ratingStatsService");
const { computeGenreStats } = require("./genreStatsService");
const { attachFavoriteFlags } = require("./postFavoriteService");
const { canViewPrivateUserContent } = require("./socialService");

const MEDIA_TABS = {
  movies: "movie",
  "web-shows": "series",
  books: "book",
  music: "music",
};

const getMediaType = (tab) => MEDIA_TABS[tab] || "movie";

const getUserCollection = async ({ username, tab, section, viewerId }) => {
  const user = await User.findOne({ username });
  if (!user) throw new Error("User not found");

  const isOwner = viewerId && String(user._id) === String(viewerId);
  const canViewContent =
    isOwner || !user.isPrivate || (await canViewPrivateUserContent(viewerId, user._id));
  if (user.isPrivate && !canViewContent) {
    throw new Error("This profile is private");
  }

  const mediaType = getMediaType(tab);
  const listMovieType =
    mediaType === "series" ? "show" : mediaType === "music" ? "music" : mediaType;
  const tasteMediaType = mediaType === "series" ? "show" : mediaType;

  if (section === "all") {
    const postQuery = { user: user._id, type: mediaType };
    if (!isOwner) postQuery.visibility = "public";
    const posts = await Post.find(postQuery).sort({ createdAt: -1 });
    
    const postIds = posts.map((p) => p._id);
    const Like = require("../models/Like");
    const Comment = require("../models/Comment");

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

    const items = posts.map((p) => ({
      ...p.toObject(),
      likesCount: likeMap[String(p._id)] || 0,
      commentsCount: commentMap[String(p._id)] || 0,
      isLiked: myLikeSet.has(String(p._id)),
      movie: {
        _id: p._id,
        title: p.title,
        poster: p.poster,
        type: p.type === "series" ? "show" : p.type,
        artistName: p.artistName,
        previewUrl: p.previewUrl,
        youtubeVideoId: p.youtubeVideoId,
        youtubeUrl: p.youtubeUrl,
      },
    }));
    const genreStats = mediaType === "music" ? [] : computeGenreStats(posts);
    const itemsWithFav =
      isOwner && items.length ? await attachFavoriteFlags(user._id, items) : items;
    return { items: itemsWithFav, genreStats, type: "posts" };
  }

  if (section === "watchlist") {
    const entries = await UserListEntry.find({ user: user._id, listType: "watchlist" })
      .populate({ path: "movie", match: { type: listMovieType } })
      .sort({ createdAt: -1 });
    return { items: entries.filter((e) => e.movie), type: "list" };
  }

  if (section === "favorites") {
    const postQuery = { user: user._id, type: mediaType };
    if (!isOwner) postQuery.visibility = "public";
    const posts = await Post.find(postQuery).sort({ createdAt: -1 });
    
    const postIds = posts.map((p) => p._id);
    const Like = require("../models/Like");
    const Comment = require("../models/Comment");

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

    const items = posts.map((p) => ({
      ...p.toObject(),
      likesCount: likeMap[String(p._id)] || 0,
      commentsCount: commentMap[String(p._id)] || 0,
      isLiked: myLikeSet.has(String(p._id)),
      movie: {
        _id: p._id,
        title: p.title,
        poster: p.poster,
        type: p.type === "series" ? "show" : p.type,
        artistName: p.artistName,
        previewUrl: p.previewUrl,
        youtubeVideoId: p.youtubeVideoId,
        youtubeUrl: p.youtubeUrl,
      },
    }));
    
    // For favorites, we need the favorite flags even if not owner (to know which are favorited)
    const itemsWithFav = items.length ? await attachFavoriteFlags(user._id, items) : items;
    const favoritePosts = itemsWithFav.filter((p) => p.isFavorite);
    
    return {
      items: favoritePosts,
      type: "favorites",
    };
  }

  if (section === "taste") {
    const ratings = await TasteRating.find({ profileUser: user._id, mediaType: tasteMediaType })
      .populate("rater", "name username avatar")
      .sort({ createdAt: -1 });
    const avg =
      ratings.length > 0
        ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
        : null;

    let viewerRating = null;
    if (viewerId && !isOwner) {
      viewerRating = await TasteRating.findOne({
        profileUser: user._id,
        rater: viewerId,
        mediaType: tasteMediaType,
      }).select("score comment mediaType createdAt");
    }

    return { items: ratings, averageTaste: avg, viewerRating, type: "taste" };
  }

  throw new Error("Invalid section");
};

const addToList = async (userId, movieId, listType) => {
  return UserListEntry.findOneAndUpdate(
    { user: userId, movie: movieId, listType },
    { user: userId, movie: movieId, listType },
    { upsert: true, new: true }
  ).populate("movie");
};

const rateTaste = async ({ profileUserId, raterId, mediaType, score, comment }) => {
  if (String(profileUserId) === String(raterId)) {
    throw new Error("You cannot rate your own taste");
  }

  const tasteType = mediaType === "series" ? "show" : mediaType;

  const existing = await TasteRating.findOne({
    profileUser: profileUserId,
    rater: raterId,
    mediaType: tasteType,
  });
  if (existing) {
    const label =
      tasteType === "movie" ? "movies" : tasteType === "show" ? "web shows" : "books";
    const err = new Error(`You have already rated this user's ${label} taste`);
    err.statusCode = 409;
    throw err;
  }

  const rating = await TasteRating.create({
    profileUser: profileUserId,
    rater: raterId,
    mediaType: tasteType,
    score,
    comment: comment || "",
  });
  await syncCommunityAverageRating(profileUserId);
  return rating.populate("rater", "name username avatar");
};

module.exports = { getUserCollection, addToList, rateTaste, getMediaType, MEDIA_TABS };
