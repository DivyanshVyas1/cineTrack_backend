const YTMusic = require("ytmusic-api");

const ytmusic = new YTMusic();
let initialized = false;

const initYTMusic = async () => {
  if (!initialized) {
    await ytmusic.initialize();
    initialized = true;
  }
};

const searchYTMusic = async (query) => {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  try {
    await initYTMusic();
    // Search strictly for songs to avoid weird video names
    const results = await ytmusic.searchSongs(q);

    return (results || []).slice(0, 8).map((item) => {
      const videoId = item.videoId || "";
      const title = item.name || "";
      const artist = item.artist ? item.artist.name : "";
      const album = item.album ? item.album.name : "";

      const poster = item.thumbnails && item.thumbnails.length > 0 
        ? item.thumbnails[item.thumbnails.length - 1].url 
        : "";

      return {
        externalId: videoId,
        videoId,
        title,
        artistName: artist,
        artist,
        album,
        overview: artist,
        poster,
        duration: item.duration || 0,
        durationLabel: "",
        // We provide the raw videoId. The frontend MusicAudioPlayer 
        // will pass this to react-youtube to play seamlessly via iframe.
        previewUrl: videoId, 
        youtubeUrl: videoId ? `https://music.youtube.com/watch?v=${videoId}` : "",
        genres: [],
        releaseDate: null,
        type: "music",
        source: "ytmusic",
      };
    });
  } catch (error) {
    console.error("ytmusic-api search error:", error);
    return [];
  }
};

module.exports = { searchYTMusic };
