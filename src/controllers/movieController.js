const asyncHandler = require("../utils/asyncHandler");
const Movie = require("../models/Movie");
const movieService = require("../services/movieService");
const { searchSuggestions: unifiedSearch } = require("../services/searchService");
const { getPostsForMovie } = require("../services/moviePostsService");
const { successResponse } = require("../utils/responseFormatter");

const createMovie = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user?.id };
  if (payload.releaseDate) {
    const parsed = new Date(payload.releaseDate);
    payload.releaseDate = Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  const movie = await Movie.create(payload);
  successResponse(res, movie, "Movie/show added", 201);
});

const searchSuggestions = asyncHandler(async (req, res) => {
  const type = req.query.type || "movie";
  const q = (req.query.query || req.query.q || "").trim();
  const data = await unifiedSearch(q, type);
  successResponse(res, data, "Suggestions fetched");
});

const listMovies = asyncHandler(async (req, res) => {
  const data = await movieService.listMovies(req.query);
  successResponse(res, data, "Movies fetched");
});

const trendingWeek = asyncHandler(async (_req, res) => {
  const data = await movieService.getTrendingWeek();
  successResponse(res, data, "Trending fetched");
});

const getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    res.status(404);
    throw new Error("Movie not found");
  }
  successResponse(res, movie, "Movie fetched");
});

const getMovieReviews = asyncHandler(async (req, res) => {
  const data = await getPostsForMovie(req.params.id, req.user?.id);
  successResponse(res, data, "Reviews fetched");
});

module.exports = {
  createMovie,
  listMovies,
  trendingWeek,
  getMovie,
  getMovieReviews,
  searchSuggestions,
};
