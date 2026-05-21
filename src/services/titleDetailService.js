const Post = require("../models/Post");
const { canViewPrivateUserContent } = require("./socialService");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizePostType = (type) => {
  if (type === "show" || type === "web-shows") return "series";
  return type || "movie";
};

const buildTitleQuery = (type, title, externalId) => {
  const postType = normalizePostType(type);
  const trimmed = (title || "").trim();
  if (!trimmed) return null;

  const query = {
    type: postType,
    title: new RegExp(`^${escapeRegex(trimmed)}$`, "i"),
  };
  if (externalId?.trim()) query.externalId = externalId.trim();
  return query;
};

const mapPostTypeToDisplay = (postType) => {
  if (postType === "series") return "show";
  return postType;
};

const getTitleDetail = async (type, title, externalId, viewerId) => {
  const query = buildTitleQuery(type, title, externalId);
  if (!query) {
    const err = new Error("Title and type are required");
    err.statusCode = 400;
    throw err;
  }

  const posts = await Post.find(query)
    .populate("user", "name username avatar isPrivate")
    .sort({ createdAt: -1 })
    .limit(100);

  if (!posts.length) {
    const err = new Error("Title not found");
    err.statusCode = 404;
    throw err;
  }

  const sample = posts.find((p) => p.poster) || posts[0];
  const visible = [];

  for (const post of posts) {
    const authorId = String(post.user._id);
    const isAuthor = viewerId && authorId === String(viewerId);

    if (post.visibility === "private" && !isAuthor) continue;

    if (post.user.isPrivate && !isAuthor) {
      const allowed = await canViewPrivateUserContent(viewerId, post.user._id);
      if (!allowed) continue;
    }

    const obj = post.toObject();
    visible.push({
      ...obj,
      movie: {
        title: obj.title,
        poster: obj.poster,
        type: mapPostTypeToDisplay(obj.type),
      },
      user: obj.user,
    });
  }

  const ratings = visible.map((p) => Number(p.rating)).filter((n) => Number.isFinite(n));
  const average =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

  const titleInfo = {
    title: sample.title,
    type: mapPostTypeToDisplay(sample.type),
    postType: sample.type,
    externalId: sample.externalId || "",
    poster: sample.poster || "",
    backdrop: sample.poster || "",
    overview: sample.artistName || "",
    artistName: sample.artistName || "",
    duration: sample.duration || 0,
    previewUrl: sample.previewUrl || "",
    youtubeVideoId: sample.youtubeVideoId || "",
    youtubeUrl: sample.youtubeUrl || "",
    genres: sample.genres || [],
  };

  return {
    title: titleInfo,
    reviews: visible,
    stats: { count: visible.length, average },
  };
};

module.exports = { getTitleDetail, normalizePostType };
