const User = require("../models/User");
const Review = require("../models/Review");
const TasteRating = require("../models/TasteRating");
const Post = require("../models/Post");
const { getGenreStatsForUser } = require("./genreStatsService");
const socialService = require("./socialService");
const { getCommunityAverageRating } = require("./ratingStatsService");
const { getTasteMatchBetween } = require("./tasteMatchService");

const getProfileByUsername = async (username, viewerId) => {
  const user = await User.findOne({ username }).select("-password");
  if (!user) throw new Error("User not found");

  const isOwner = viewerId && String(user._id) === String(viewerId);
  
  let isAdmin = false;
  if (viewerId) {
    const viewer = await User.findById(viewerId);
    if (viewer && viewer.role === "admin") isAdmin = true;
  }

  if (user.isPrivate && !isOwner && !isAdmin) {
    const status = viewerId
      ? await socialService.getFollowStatus(viewerId, username)
      : { isFollowing: false, requestPending: false, followersCount: 0, followingCount: 0 };
    const canViewContent = status.isFollowing;
    const genreOverall = await getGenreStatsForUser(Post, user._id);
    const tasteMatch = viewerId ? await getTasteMatchBetween(viewerId, user._id) : null;

    return {
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        isPrivate: true,
        favoriteCharacters: user.favoriteCharacters || [],
        ganduCharacters: user.ganduCharacters || [],
      },
      isPrivateProfile: true,
      canViewContent,
      isFollowing: status.isFollowing,
      requestPending: status.requestPending,
      tasteMatchPercent: tasteMatch?.percent ?? null,
      genreOverall,
      stats: {
        followersCount: status.followersCount,
        followingCount: status.followingCount,
        averageRating: null,
        ratingsCount: 0,
      },
    };
  }

  const [social, ratingStats, tasteReviews, genreOverall] = await Promise.all([
    socialService.getSocialStats(user._id),
    getCommunityAverageRating(user._id),
    TasteRating.find({ profileUser: user._id })
      .populate("rater", "name username avatar")
      .sort({ createdAt: -1 })
      .limit(12),
    getGenreStatsForUser(Post, user._id),
  ]);

  let isFollowing = false;
  let requestPending = false;
  let tasteMatchPercent = null;
  let viewerTasteRatings = null;
  if (viewerId && !isOwner) {
    const status = await socialService.getFollowStatus(viewerId, username);
    isFollowing = status.isFollowing;
    requestPending = status.requestPending;
    const match = await getTasteMatchBetween(viewerId, user._id);
    tasteMatchPercent = match?.percent ?? null;
    const mine = await TasteRating.find({ profileUser: user._id, rater: viewerId });
    viewerTasteRatings = {
      movie: mine.find((r) => r.mediaType === "movie") || null,
      show: mine.find((r) => r.mediaType === "show") || null,
      book: mine.find((r) => r.mediaType === "book") || null,
    };
  }

  return {
    user,
    isPrivateProfile: false,
    canViewContent: true,
    isOwner,
    isFollowing,
    requestPending,
    tasteMatchPercent,
    tasteReviews,
    genreOverall,
    viewerTasteRatings,
    stats: {
      followersCount: social.followersCount,
      followingCount: social.followingCount,
      averageRating: ratingStats.averageRating,
      ratingsCount: ratingStats.ratingsCount,
    },
  };
};

const getUserReviews = async (username, viewerId) => {
  const user = await User.findOne({ username });
  if (!user) throw new Error("User not found");

  const isOwner = viewerId && String(user._id) === String(viewerId);
  if (user.isPrivate && !isOwner) {
    const canView = await socialService.canViewPrivateUserContent(viewerId, user._id);
    if (!canView) throw new Error("This profile is private");
  }

  return Review.find({ user: user._id })
    .populate("movie")
    .sort({ createdAt: -1 })
    .limit(50);
};

const updatePrivacy = async (userId, isPrivate) => {
  const user = await User.findByIdAndUpdate(userId, { isPrivate }, { new: true }).select("-password");
  if (!user) throw new Error("User not found");
  return user;
};

const MAX_BIO_LENGTH = 280;
const MAX_AVATAR_LENGTH = 500_000;

const normalizeCharacters = (list, label) => {
  if (!Array.isArray(list) || list.length > 3) {
    throw new Error(`You can add at most 3 ${label}`);
  }
  return list
    .filter((c) => c?.name?.trim())
    .slice(0, 3)
    .map((c) => ({ name: c.name.trim(), source: (c.source || "").trim() }));
};

const updateProfile = async (userId, { bio, avatar, characters, ganduCharacters }) => {
  const update = {};

  if (bio !== undefined) {
    update.bio = String(bio).trim().slice(0, MAX_BIO_LENGTH);
  }

  if (avatar !== undefined) {
    const value = String(avatar || "").trim();
    if (value && !value.startsWith("data:image/") && !/^https?:\/\//i.test(value)) {
      throw new Error("Avatar must be an image URL or uploaded image");
    }
    if (value.length > MAX_AVATAR_LENGTH) {
      throw new Error("Image is too large. Use a smaller photo.");
    }
    update.avatar = value;
  }

  if (characters !== undefined) {
    update.favoriteCharacters = normalizeCharacters(characters, "favorite characters");
  }

  if (ganduCharacters !== undefined) {
    update.ganduCharacters = normalizeCharacters(ganduCharacters, "pure gaandu characters");
  }

  const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");
  if (!user) throw new Error("User not found");
  return user;
};

module.exports = { getProfileByUsername, getUserReviews, updatePrivacy, updateProfile };
