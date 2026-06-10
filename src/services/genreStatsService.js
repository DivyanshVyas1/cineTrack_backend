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

  // Find max count to normalize counts (0 to 1)
  const maxCount = Math.max(...entries.map(([, b]) => b.count));
  if (maxCount === 0) return [];

  let totalScore = 0;
  const scoredEntries = entries.map(([genre, b]) => {
    const avgRating = b.sumRating / b.count;
    
    // New formula: GenreAffinity = GenreWatchCount * sumRating * log(GenreWatchCount + 1)
    const rawScore = b.count * b.sumRating * Math.log10(b.count + 1);
    const score = rawScore > 0 ? Math.pow(rawScore, 0.3) : 0;
    totalScore += score;
    
    return { genre, b, score, avgRating };
  });

  if (totalScore <= 0) return [];

  return scoredEntries
    .map(({ genre, b, score, avgRating }) => ({
      genre,
      percent: Math.round((score / totalScore) * 1000) / 10,
      avgRating: Math.round(avgRating * 10) / 10,
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
