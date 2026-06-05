const Movie = require("../models/Movie");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const { canViewPrivateUserContent } = require("./socialService");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const movieTypeToPostType = (movieType) => {
  if (movieType === "show") return "series";
  return movieType;
};

const buildMovieQuery = (movie) => {
  const type = movieTypeToPostType(movie.type);
  const title = movie.title?.trim();
  if (!title) return null;
  return {
    type,
    title: new RegExp(`^${escapeRegex(title)}$`, "i"),
  };
};

const enrichPostForMoviePage = (post, movie) => {
  const obj = post.toObject ? post.toObject() : post;
  return {
    ...obj,
    movie: {
      _id: movie._id,
      title: movie.title,
      poster: movie.poster || obj.poster,
      type: movie.type,
    },
    user: obj.user,
  };
};

const getPostsForMovie = async (movieId, viewerId) => {
  const movie = await Movie.findById(movieId);
  if (!movie) {
    const err = new Error("Movie not found");
    err.statusCode = 404;
    throw err;
  }

  const query = buildMovieQuery(movie);
  if (!query) return { movie, reviews: [], stats: { count: 0, average: null } };

  if (!movie.poster) {
    const withPoster = await Post.findOne({ ...query, poster: { $ne: "" } })
      .select("poster backdrop")
      .sort({ createdAt: -1 });
    if (withPoster?.poster) {
      movie.poster = withPoster.poster;
      if (!movie.backdrop) movie.backdrop = withPoster.poster;
    }
  }

  const posts = await Post.find(query)
    .populate("user", "name username avatar isPrivate")
    .sort({ createdAt: -1 })
    .limit(100);

  const visible = [];
  let totalCount = 0;
  const allRatings = [];

  for (const post of posts) {
    const authorId = String(post.user._id);
    const isAuthor = viewerId && authorId === String(viewerId);

    if (post.visibility === "private" && !isAuthor) continue;

    totalCount++;
    if (Number.isFinite(Number(post.rating))) {
      allRatings.push(Number(post.rating));
    }

    if (post.user.isPrivate && !isAuthor) {
      const allowed = await canViewPrivateUserContent(viewerId, post.user._id);
      if (!allowed) continue;
    }

    visible.push(enrichPostForMoviePage(post, movie));
  }

  const average =
    allRatings.length > 0
      ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
      : null;

  return {
    movie,
    reviews: visible,
    stats: { count: totalCount, average },
  };
};

module.exports = { getPostsForMovie, buildMovieQuery, movieTypeToPostType };
