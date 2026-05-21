const YTMusic = require("ytmusic-api");

let client = null;
let initPromise = null;

const getClient = async () => {
  if (client) return client;
  if (!initPromise) {
    initPromise = (async () => {
      const api = new YTMusic();
      await api.initialize();
      client = api;
      return api;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
};

const pickThumbnail = (thumbnails = []) => {
  if (!thumbnails.length) return "";
  const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
  const mid = sorted.find((t) => (t.width || 0) >= 120 && (t.width || 0) <= 300);
  return (mid || sorted[0] || sorted[sorted.length - 1])?.url || "";
};

const formatDuration = (seconds) => {
  if (!seconds || seconds < 1) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const searchYTMusic = async (query) => {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  const api = await getClient();
  const songs = await api.searchSongs(q);

  return (songs || []).slice(0, 8).map((track) => {
    const artistName = track.artist?.name || "";
    const videoId = track.videoId || "";
    return {
      externalId: videoId,
      videoId,
      title: track.name || "",
      artistName,
      artist: artistName,
      album: track.album?.name || "",
      overview: artistName,
      poster: pickThumbnail(track.thumbnails),
      duration: track.duration || 0,
      durationLabel: formatDuration(track.duration),
      previewUrl: videoId ? `/api/music/preview/${videoId}` : "",
      youtubeUrl: videoId ? `https://music.youtube.com/watch?v=${videoId}` : "",
      genres: [],
      releaseDate: null,
      type: "music",
      source: "ytmusic",
    };
  });
};

module.exports = { searchYTMusic, getClient };
