/**
 * Genre % = (Σ rating for posts with genre G) / (Σ rating across all genre assignments) × 100
 * Avg for genre G = Σ rating / count of posts tagged with G
 */
const computeGenreStats = (posts) => {
  const buckets = {};

  for (const post of posts) {
    const rating = Number(post.rating);
    if (!Number.isFinite(rating) || rating <= 0) continue;

    const genres = (post.genres || []).map((g) => String(g).trim()).filter(Boolean);
    if (!genres.length) continue;

    for (const genre of genres) {
      if (!buckets[genre]) {
        buckets[genre] = { sumRating: 0, count: 0 };
      }
      buckets[genre].sumRating += rating;
      buckets[genre].count += 1;
    }
  }

  const entries = Object.entries(buckets);
  if (!entries.length) return [];

  const totalWeighted = entries.reduce((s, [, b]) => s + b.sumRating, 0);
  if (totalWeighted <= 0) return [];

  return entries
    .map(([genre, b]) => ({
      genre,
      percent: Math.round((b.sumRating / totalWeighted) * 1000) / 10,
      avgRating: Math.round((b.sumRating / b.count) * 10) / 10,
      count: b.count,
    }))
    .sort((a, b) => b.percent - a.percent);
};

const getGenreStatsForUser = async (Post, userId, typeFilter = null) => {
  const query = { user: userId };
  if (typeFilter) query.type = typeFilter;
  const posts = await Post.find(query).select("genres rating type title");
  return computeGenreStats(posts);
};

module.exports = { computeGenreStats, getGenreStatsForUser };
