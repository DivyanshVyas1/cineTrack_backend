const axios = require("axios");
const { externalHeaders } = require("../utils/externalHttp");

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

const wikiGet = (url, params) =>
  axios
    .get(url, {
      params: { format: "json", ...params },
      headers: externalHeaders(),
      timeout: 12000,
    })
    .then((res) => res.data);

const fetchWikipediaPoster = async (title) => {
  try {
    const data = await wikiGet(WIKIPEDIA_API, {
      action: "query",
      titles: title,
      prop: "pageimages",
      pithumbsize: 300,
      redirects: 1,
    });
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source || "";
  } catch {
    return "";
  }
};

const searchWikipedia = async (query) => {
  const data = await wikiGet(WIKIPEDIA_API, {
    action: "opensearch",
    search: query.trim(),
    limit: 8,
    namespace: 0,
  });

  const titles = data?.[1] || [];
  const descriptions = data?.[2] || [];

  const items = titles.map((title, i) => ({
    externalId: `wp:${title}`,
    title,
    overview: descriptions[i] || "",
    poster: "",
    genres: [],
    releaseDate: null,
    type: "character",
    source: "wikipedia",
  }));

  await Promise.all(
    items.map(async (item) => {
      item.poster = await fetchWikipediaPoster(item.title);
    })
  );

  return items;
};

const searchWikidata = async (query) => {
  const data = await wikiGet(WIKIDATA_API, {
    action: "wbsearchentities",
    search: query.trim(),
    language: "en",
    limit: 8,
  });

  const searchResults = data?.search || [];
  if (!searchResults.length) return [];

  const items = searchResults.map((item) => ({
    externalId: item.id,
    title: item.label || item.id,
    overview: item.description || "",
    poster: "",
    genres: [],
    releaseDate: null,
    type: "character",
    source: "wikidata",
  }));

  await Promise.all(
    items.map(async (item) => {
      try {
        const entityData = await wikiGet(WIKIDATA_API, {
          action: "wbgetentities",
          ids: item.externalId,
          props: "claims",
        });
        const entity = entityData?.entities?.[item.externalId];
        const fileName = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (fileName) {
          item.poster = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=400`;
        } else {
          item.poster = await fetchWikipediaPoster(item.title);
        }
      } catch {
        item.poster = await fetchWikipediaPoster(item.title);
      }
    })
  );

  return items;
};

const searchCharacters = async (query) => {
  try {
    const wikidata = await searchWikidata(query);
    if (wikidata.length) return wikidata;
  } catch {
    /* fallback below */
  }
  return searchWikipedia(query);
};

module.exports = { searchCharacters };
