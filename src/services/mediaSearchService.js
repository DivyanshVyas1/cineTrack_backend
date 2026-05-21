const axios = require("axios");

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

let movieGenreMap = null;
let tvGenreMap = null;

const getTmdbApiKey = () => {
  const key = (process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN || process.env.TMDB_API || "")
    .trim()
    .replace(/^Bearer\s+/i, "");
  return key;
};

const tmdbGet = async (path, extraParams = {}) => {
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error("Set TMDB_API_KEY or TMDB_READ_TOKEN in backend/.env");
  }

  const { data } = await axios.get(`${TMDB_BASE}${path}`, {
    params: { api_key: apiKey, language: "en-US", ...extraParams },
    headers: { Accept: "application/json" },
    timeout: 15000,
  });

  return data;
};

const loadGenreMaps = async () => {
  try {
    if (!movieGenreMap) {
      const data = await tmdbGet("/genre/movie/list");
      movieGenreMap = Object.fromEntries((data.genres || []).map((g) => [g.id, g.name]));
    }
    if (!tvGenreMap) {
      const data = await tmdbGet("/genre/tv/list");
      tvGenreMap = Object.fromEntries((data.genres || []).map((g) => [g.id, g.name]));
    }
  } catch {
    movieGenreMap = movieGenreMap || {};
    tvGenreMap = tvGenreMap || {};
  }
};

const mapGenreIds = (ids, map) => (ids || []).map((id) => map[id]).filter(Boolean);
const posterUrl = (path) => (path ? `${TMDB_IMAGE}${path}` : "");

const normalizeType = (type) => {
  if (type === "show" || type === "series" || type === "web-shows") return "series";
  if (type === "book") return "book";
  if (type === "music") return "music";
  if (type === "character") return "character";
  return "movie";
};

const searchTmdb = async (query, type) => {
  await loadGenreMaps();
  const isSeries = normalizeType(type) === "series";

  const data = await tmdbGet(isSeries ? "/search/tv" : "/search/movie", {
    query: query.trim(),
    page: 1,
    include_adult: false,
  });

  const genreMap = isSeries ? tvGenreMap : movieGenreMap;
  const results = data.results || [];

  return results.slice(0, 8).map((item) => ({
    externalId: String(item.id),
    title: isSeries ? item.name : item.title,
    overview: item.overview || "",
    poster: posterUrl(item.poster_path),
    genres: mapGenreIds(item.genre_ids, genreMap),
    releaseDate: isSeries ? item.first_air_date || null : item.release_date || null,
    type: isSeries ? "series" : "movie",
    source: "tmdb",
  }));
};

const searchGoogleBooks = async (query) => {
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (!key) throw new Error("GOOGLE_BOOKS_API_KEY is not set in backend/.env");

  const { data } = await axios.get("https://www.googleapis.com/volumes", {
    params: { q: query.trim(), maxResults: 8, key },
    timeout: 12000,
  });

  return (data.items || []).map((item) => {
    const info = item.volumeInfo || {};
    const thumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "";
    return {
      externalId: item.id,
      title: info.title || "Untitled",
      overview: (info.description || "").replace(/<[^>]+>/g, "").slice(0, 500),
      poster: thumb ? thumb.replace(/^http:/, "https:") : "",
      genres: info.categories || [],
      releaseDate: info.publishedDate || null,
      type: "book",
      source: "google_books",
    };
  });
};

const searchSuggestions = async (query, type) => {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  const normalized = normalizeType(type);
  if (normalized === "book") return searchGoogleBooks(q);
  if (normalized === "music") {
    const { searchYTMusic } = require("./ytmusicService");
    return searchYTMusic(q);
  }
  return searchTmdb(q, normalized);
};

module.exports = { searchSuggestions, normalizeType };
