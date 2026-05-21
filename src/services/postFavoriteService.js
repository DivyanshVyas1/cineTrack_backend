const Movie = require("../models/Movie");
const UserListEntry = require("../models/UserListEntry");
const Post = require("../models/Post");

const postTypeToMovieType = (type) => {
  if (type === "series") return "show";
  if (type === "music") return "music";
  return type;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findOrCreateMovieFromPost = async (post, userId) => {
  const movieType = postTypeToMovieType(post.type);
  const title = post.title?.trim();
  if (!title) throw new Error("Post has no title");

  let movie = await Movie.findOne({
    title: new RegExp(`^${escapeRegex(title)}$`, "i"),
    type: movieType,
  });

  if (!movie) {
    movie = await Movie.create({
      title,
      type: movieType,
      poster: post.poster || "",
      genres: post.genres || [],
      createdBy: userId,
    });
  }

  return movie;
};

const getFavoriteMovieIds = async (userId, movieIds) => {
  if (!movieIds.length) return new Set();
  const entries = await UserListEntry.find({
    user: userId,
    listType: "favorite",
    movie: { $in: movieIds },
  }).select("movie");
  return new Set(entries.map((e) => String(e.movie)));
};

const attachFavoriteFlags = async (userId, items) => {
  if (!userId || !items?.length) return items;

  const moviesByKey = new Map();
  const movieIds = [];

  for (const item of items) {
    const movieType = postTypeToMovieType(item.type);
    const key = `${movieType}::${(item.title || "").trim().toLowerCase()}`;
    if (!item.title?.trim() || moviesByKey.has(key)) continue;

    const movie = await Movie.findOne({
      title: new RegExp(`^${escapeRegex(item.title.trim())}$`, "i"),
      type: movieType,
    });
    if (movie) {
      moviesByKey.set(key, movie._id);
      movieIds.push(movie._id);
    }
  }

  const favSet = await getFavoriteMovieIds(userId, [...new Set(movieIds.map(String))]);

  return items.map((item) => {
    const movieType = postTypeToMovieType(item.type);
    const key = `${movieType}::${(item.title || "").trim().toLowerCase()}`;
    const movieId = moviesByKey.get(key);
    return {
      ...item,
      isFavorite: movieId ? favSet.has(String(movieId)) : false,
    };
  });
};

const togglePostFavorite = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }
  if (String(post.user) !== String(userId)) {
    const err = new Error("You can only favourite your own posts");
    err.statusCode = 403;
    throw err;
  }

  const movie = await findOrCreateMovieFromPost(post, userId);
  const existing = await UserListEntry.findOne({
    user: userId,
    movie: movie._id,
    listType: "favorite",
  });

  if (existing) {
    await existing.deleteOne();
    return { isFavorite: false, movieId: movie._id };
  }

  await UserListEntry.findOneAndUpdate(
    { user: userId, movie: movie._id, listType: "favorite" },
    { user: userId, movie: movie._id, listType: "favorite" },
    { upsert: true, new: true }
  );

  return { isFavorite: true, movieId: movie._id };
};

module.exports = {
  attachFavoriteFlags,
  togglePostFavorite,
  findOrCreateMovieFromPost,
};
