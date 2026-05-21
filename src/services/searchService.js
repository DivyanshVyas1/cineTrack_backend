const { searchSuggestions: mediaSearch } = require("./mediaSearchService");
const { searchCharacters } = require("./wikidataSearchService");
const { searchYTMusic } = require("./ytmusicService");
const { normalizeType } = require("./mediaSearchService");

const searchSuggestions = async (query, type) => {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  const normalized = normalizeType(type);

  if (normalized === "character") {
    return searchCharacters(q);
  }

  if (normalized === "music") {
    return searchYTMusic(q);
  }

  return mediaSearch(q, normalized);
};

module.exports = { searchSuggestions };
