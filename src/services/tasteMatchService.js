const Post = require("../models/Post");
const User = require("../models/User");
const Follow = require("../models/Follow");
const { computeGenreStats } = require("./genreStatsService");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const genreVectorFromStats = (stats) => {
  const vec = {};
  for (const row of stats || []) {
    vec[row.genre] = row.percent / 100;
  }
  return vec;
};

const cosineSimilarity = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (!keys.size) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    const va = a[k] || 0;
    const vb = b[k] || 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

const buildTitleKey = (post) => {
  const type = post.type;
  const title = (post.title || "").trim().toLowerCase();
  const ext = (post.externalId || "").trim();
  return ext ? `${type}::${ext}` : `${type}::${title}`;
};

const ratingSimilarity = (postsA, postsB) => {
  const mapB = new Map();
  for (const p of postsB) {
    mapB.set(buildTitleKey(p), Number(p.rating));
  }
  let sum = 0;
  let count = 0;
  for (const p of postsA) {
    const key = buildTitleKey(p);
    const rb = mapB.get(key);
    if (rb == null || !Number.isFinite(rb)) continue;
    const ra = Number(p.rating);
    if (!Number.isFinite(ra)) continue;
    sum += 1 - Math.abs(ra - rb) / 10;
    count += 1;
  }
  if (!count) return null;
  return sum / count;
};

const computeMatchPercent = (genreSim, ratingSim, overlapCount) => {
  const MIN_OVERLAP = 2;
  let score;
  if (ratingSim == null || overlapCount < MIN_OVERLAP) {
    score = genreSim;
  } else {
    score = genreSim * 0.5 + ratingSim * 0.5;
  }
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
};

const getUserPostsForMatch = async (userId) =>
  Post.find({ user: userId }).select("title type externalId genres rating").lean();

const getTasteMatchBetween = async (viewerId, targetUserId) => {
  if (!viewerId || String(viewerId) === String(targetUserId)) return null;

  const [viewerPosts, targetPosts] = await Promise.all([
    getUserPostsForMatch(viewerId),
    getUserPostsForMatch(targetUserId),
  ]);

  if (!viewerPosts.length || !targetPosts.length) return { percent: 0, overlapCount: 0 };

  const viewerGenres = genreVectorFromStats(computeGenreStats(viewerPosts));
  const targetGenres = genreVectorFromStats(computeGenreStats(targetPosts));
  const genreSim = cosineSimilarity(viewerGenres, targetGenres);

  const ratingSim = ratingSimilarity(viewerPosts, targetPosts);
  const overlapCount = viewerPosts.filter((p) => {
    const key = buildTitleKey(p);
    return targetPosts.some((t) => buildTitleKey(t) === key);
  }).length;

  return {
    percent: computeMatchPercent(genreSim, ratingSim, overlapCount),
    overlapCount,
  };
};

const getTasteSuggestions = async (viewerId, limit = 8) => {
  if (!viewerId) return [];

  const viewerPosts = await getUserPostsForMatch(viewerId);
  if (!viewerPosts.length) return [];

  const viewerGenres = genreVectorFromStats(computeGenreStats(viewerPosts));

  const following = await Follow.find({ follower: viewerId }).select("following");
  const excludeIds = new Set([
    String(viewerId),
    ...following.map((f) => String(f.following)),
  ]);

  const candidates = await User.find({ _id: { $nin: [...excludeIds] } })
    .select("name username avatar isPrivate")
    .limit(80)
    .lean();

  const scored = [];
  for (const user of candidates) {
    const posts = await getUserPostsForMatch(user._id);
    if (!posts.length) continue;

    const targetGenres = genreVectorFromStats(computeGenreStats(posts));
    const genreSim = cosineSimilarity(viewerGenres, targetGenres);
    const ratingSim = ratingSimilarity(viewerPosts, posts);
    const overlapCount = viewerPosts.filter((p) =>
      posts.some((t) => buildTitleKey(t) === buildTitleKey(p))
    ).length;

    const percent = computeMatchPercent(genreSim, ratingSim, overlapCount);
    if (percent < 15) continue;

    scored.push({
      user,
      tasteMatchPercent: percent,
      overlapCount,
    });
  }

  scored.sort((a, b) => b.tasteMatchPercent - a.tasteMatchPercent);
  return scored.slice(0, limit);
};

module.exports = {
  getTasteMatchBetween,
  getTasteSuggestions,
  computeMatchPercent,
};
