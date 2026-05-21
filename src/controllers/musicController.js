const asyncHandler = require("../utils/asyncHandler");
const { getAudioStreamUrl, VIDEO_ID_RE } = require("../services/audioStreamService");
const { successResponse } = require("../utils/responseFormatter");

const streamPreview = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!VIDEO_ID_RE.test(videoId)) {
    res.status(400);
    throw new Error("Invalid video id");
  }

  const audioUrl = await getAudioStreamUrl(videoId);
  res.redirect(302, audioUrl);
});

const previewInfo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!VIDEO_ID_RE.test(videoId)) {
    res.status(400);
    throw new Error("Invalid video id");
  }

  successResponse(
    res,
    {
      videoId,
      previewUrl: `/api/music/preview/${videoId}`,
      youtubeUrl: `https://music.youtube.com/watch?v=${videoId}`,
    },
    "Preview info"
  );
});

module.exports = { streamPreview, previewInfo };
