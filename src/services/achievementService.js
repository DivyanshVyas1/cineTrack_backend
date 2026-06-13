const Post = require("../models/Post");
const User = require("../models/User");
const { ACHIEVEMENT_TRACKS, TIER_COLORS } = require("../config/achievementsConfig");

async function getUserProgress(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const posts = await Post.find({ user: userId });

  let musicCount = 0;
  let reviewCount = 0;
  let movieSeriesCount = 0;
  let bookCount = 0;
  let perfectRatings = 0;
  let maxDurationMinutes = 0;
  let totalDurationMinutes = 0;

  const genreCounts = {};

  posts.forEach(post => {
    // Audiophile
    if (post.type === "music") musicCount++;
    
    // Grand Librarian
    if (post.type === "movie" || post.type === "series" || post.type === "show") {
      movieSeriesCount++;
    }

    // Bibliophile
    if (post.type === "book") bookCount++;

    // Pen & Paper Critic
    if (post.note && post.note.trim() !== "") reviewCount++;

    // Masterpiece Hunter
    if (post.rating === 10) perfectRatings++;

    // Marathon Runner & Total Life Wasted
    if ((post.type === "movie" || post.type === "series" || post.type === "show") && post.duration) {
      totalDurationMinutes += post.duration;
      if (post.duration > maxDurationMinutes) {
        maxDurationMinutes = post.duration;
      }
    }

    // Genre Specialist
    if (post.genres && Array.isArray(post.genres)) {
      post.genres.forEach(g => {
        const lower = g.toLowerCase();
        genreCounts[lower] = (genreCounts[lower] || 0) + 1;
      });
    }
  });

  const genreMax = Object.values(genreCounts).length > 0 
    ? Math.max(...Object.values(genreCounts)) 
    : 0;

  const soulmateCount = user.comparedUsers ? user.comparedUsers.length : 0;
  const executionerCount = user.watchlistCompletions || 0;

  return {
    genreSpecialist: { count: genreMax, max: 100 },
    audiophile: { count: musicCount, max: 100 },
    critic: { count: reviewCount, max: 100 },
    grandLibrarian: { count: movieSeriesCount, max: 200 },
    bibliophile: { count: bookCount, max: 100 },
    soulmate: { count: soulmateCount, max: 100 },
    masterpieceHunter: { count: perfectRatings, max: 30 },
    executioner: { count: executionerCount, max: 100 },
    marathonRunner: { count: Math.floor(maxDurationMinutes / 60), max: 120 },
    totalLifeWasted: { count: Math.floor(totalDurationMinutes / 1440), max: 100 }
  };
}

async function updateTopBadges(userId) {
  try {
    const progress = await getUserProgress(userId);
    
    let unlockedBadges = [];
    
    for (const track of ACHIEVEMENT_TRACKS) {
      const data = progress[track.id];
      if (!data) continue;
      
      const currentCount = data.count || 0;
      
      let tierLevel = -1;
      let tierName = null;
      
      if (currentCount >= track.milestones[3]) { tierLevel = 4; tierName = "heroic"; }
      else if (currentCount >= track.milestones[2]) { tierLevel = 3; tierName = "diamond"; }
      else if (currentCount >= track.milestones[1]) { tierLevel = 2; tierName = "gold"; }
      else if (currentCount >= track.milestones[0]) { tierLevel = 1; tierName = "bronze"; }
      
      if (tierLevel > 0 && tierName) {
        unlockedBadges.push({
          trackId: track.id,
          tierName,
          tierLevel,
          icon: track.icon,
          color: TIER_COLORS[tierName].color,
          bg: TIER_COLORS[tierName].bg,
          border: TIER_COLORS[tierName].border,
          glow: TIER_COLORS[tierName].glow,
          currentCount
        });
      }
    }
    
    unlockedBadges.sort((a, b) => {
      if (b.tierLevel !== a.tierLevel) return b.tierLevel - a.tierLevel;
      return b.currentCount - a.currentCount;
    });
    
    const top2 = unlockedBadges.slice(0, 2).map(b => ({
      trackId: b.trackId,
      tierName: b.tierName,
      icon: b.icon,
      color: b.color,
      bg: b.bg,
      border: b.border,
      glow: b.glow
    }));
    
    await User.findByIdAndUpdate(userId, { topBadges: top2 });
  } catch (error) {
    console.error(`Failed to update top badges for user ${userId}:`, error);
  }
}

module.exports = { getUserProgress, updateTopBadges };
