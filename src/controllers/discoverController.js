const asyncHandler = require("../utils/asyncHandler");
const { getTrendingCharacters } = require("../services/characterTrendingService");
const { getTopRatedSongs, getTrendingByType } = require("../services/discoverAggregateService");
const { successResponse } = require("../utils/responseFormatter");

const trendingCharacters = asyncHandler(async (_req, res) => {
  const data = await getTrendingCharacters(12);
  successResponse(res, data, "Trending characters fetched");
});

const topRatedSongs = asyncHandler(async (_req, res) => {
  const data = await getTopRatedSongs(12);
  successResponse(res, data, "Top rated songs fetched");
});

const discoverSummary = asyncHandler(async (_req, res) => {
  const [favorite, gandu, topSongs, trendingMovies, trendingShows, trendingBooks] =
    await Promise.all([
      getTrendingCharacters(8).then((r) => r.favorite),
      getTrendingCharacters(8).then((r) => r.gandu),
      getTopRatedSongs(10),
      getTrendingByType("movie", 8),
      getTrendingByType("series", 8),
      getTrendingByType("book", 8),
    ]);

  successResponse(
    res,
    {
      characters: { favorite, gandu },
      topRatedSongs: topSongs,
      trending: {
        movies: trendingMovies,
        shows: trendingShows,
        books: trendingBooks,
      },
    },
    "Discover summary fetched"
  );
});

module.exports = { trendingCharacters, topRatedSongs, discoverSummary };
