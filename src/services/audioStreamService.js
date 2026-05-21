const ytdl = require("@distube/ytdl-core");
const youtubedl = require("youtube-dl-exec");

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const toWatchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

const getAudioUrlWithYtdl = async (videoId) => {
  const info = await ytdl.getInfo(toWatchUrl(videoId), {
    playerClients: ["ANDROID", "IOS", "TV", "WEB_EMBEDDED"],
  });
  const formats = ytdl.filterFormats(info.formats, "audioonly");
  if (!formats.length) throw new Error("No audio formats from ytdl");
  return formats[0].url;
};

const getAudioUrlWithYtDlp = async (videoId) => {
  const url = await youtubedl(toWatchUrl(videoId), {
    getUrl: true,
    format: "bestaudio[ext=m4a]/bestaudio/best",
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
  });
  const audioUrl = String(url || "").trim();
  if (!audioUrl.startsWith("http")) throw new Error("yt-dlp did not return a URL");
  return audioUrl;
};

const getAudioStreamUrl = async (videoId) => {
  if (!VIDEO_ID_RE.test(videoId)) {
    throw new Error("Invalid YouTube video id");
  }

  try {
    return await getAudioUrlWithYtdl(videoId);
  } catch {
    return getAudioUrlWithYtDlp(videoId);
  }
};

module.exports = { getAudioStreamUrl, VIDEO_ID_RE };
