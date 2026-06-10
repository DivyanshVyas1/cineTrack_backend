const Post = require("../models/Post");
const User = require("../models/User");
const { getTasteMatchBetween } = require("./tasteMatchService");

const buildTitleKey = (post) => {
  const type = post.type;
  const title = (post.title || "").trim().toLowerCase();
  const ext = (post.externalId || "").trim();
  return ext ? `${type}::${ext}` : `${type}::${title}`;
};

const getComparisonData = async (viewerId, targetUsername) => {
  if (!viewerId) throw new Error("Must be logged in to compare");

  const targetUser = await User.findOne({ username: targetUsername }).select("-password");
  if (!targetUser) throw new Error("Target user not found");

  if (String(viewerId) === String(targetUser._id)) {
    throw new Error("Cannot compare with yourself");
  }

  const viewerUser = await User.findById(viewerId).select("-password");

  const [viewerPosts, targetPosts, tasteMatch] = await Promise.all([
    Post.find({ user: viewerId }).lean(),
    Post.find({ user: targetUser._id }).lean(),
    getTasteMatchBetween(viewerId, targetUser._id)
  ]);

  // 1. Calculate Watch Time
  const getWatchTime = (posts) => {
    return posts.reduce((sum, p) => {
      if ((p.type === "movie" || p.type === "series" || p.type === "show") && p.duration) {
        return sum + p.duration;
      }
      return sum;
    }, 0);
  };
  const viewerWatchTime = getWatchTime(viewerPosts);
  const targetWatchTime = getWatchTime(targetPosts);

  // 2. Genre Stats Calculation
  const genreStats = {};
  
  const processPost = (post, isViewer) => {
    const rating = Number(post.rating) || 0;
    (post.genres || []).forEach(g => {
      const lower = g.toLowerCase();
      const name = lower.charAt(0).toUpperCase() + lower.slice(1);
      if (!genreStats[lower]) {
        genreStats[lower] = { name, viewerCount: 0, viewerSum: 0, targetCount: 0, targetSum: 0 };
      }
      if (isViewer) {
        genreStats[lower].viewerCount += 1;
        genreStats[lower].viewerSum += rating;
      } else {
        genreStats[lower].targetCount += 1;
        genreStats[lower].targetSum += rating;
      }
    });
  };

  viewerPosts.forEach(p => processPost(p, true));
  targetPosts.forEach(p => processPost(p, false));

  let viewerTotalScore = 0;
  let targetTotalScore = 0;

  const genresArray = Object.values(genreStats).map(g => {
    const viewerRaw = g.viewerCount * g.viewerSum * Math.log10(g.viewerCount + 1);
    const viewerScore = viewerRaw > 0 ? Math.pow(viewerRaw, 0.3) : 0;

    const targetRaw = g.targetCount * g.targetSum * Math.log10(g.targetCount + 1);
    const targetScore = targetRaw > 0 ? Math.pow(targetRaw, 0.3) : 0;
    
    viewerTotalScore += viewerScore;
    targetTotalScore += targetScore;

    return {
      name: g.name,
      viewerCount: g.viewerCount,
      targetCount: g.targetCount,
      viewerScore,
      targetScore,
      totalScore: viewerScore + targetScore
    };
  });

  const sortedGenres = genresArray.sort((a, b) => b.totalScore - a.totalScore);
  const top6Genres = sortedGenres.slice(0, 6);
  const otherGenres = sortedGenres.slice(6);

  let othersViewerScore = 0;
  let othersTargetScore = 0;
  otherGenres.forEach(g => {
    othersViewerScore += g.viewerScore;
    othersTargetScore += g.targetScore;
  });

  const buildGenreStat = (name, vScore, tScore) => {
    return {
      genre: name,
      viewerPercent: viewerTotalScore > 0 ? Math.round((vScore / viewerTotalScore) * 100) : 0,
      targetPercent: targetTotalScore > 0 ? Math.round((tScore / targetTotalScore) * 100) : 0
    };
  };

  const genreComparison = top6Genres.map(g => buildGenreStat(g.name, g.viewerScore, g.targetScore));
  
  if (otherGenres.length > 0) {
    genreComparison.push(buildGenreStat("Others", othersViewerScore, othersTargetScore));
  }

  const topGenres = sortedGenres.slice(0, 3).map(g => g.name);

  // 3. Characters
  const viewerCharacters = {
    favorite: viewerUser.favoriteCharacters || [],
    hated: viewerUser.ganduCharacters || []
  };
  const targetCharacters = {
    favorite: targetUser.favoriteCharacters || [],
    hated: targetUser.ganduCharacters || []
  };

  // 4. Common Picks
  const targetPostsMap = new Map();
  targetPosts.forEach(p => {
    targetPostsMap.set(buildTitleKey(p), p);
  });

  const commonPicksMap = new Map();
  let highestRatedCommon = null;
  let maxCommonRating = -1;

  viewerPosts.forEach(vp => {
    const key = buildTitleKey(vp);
    if (targetPostsMap.has(key)) {
      const tp = targetPostsMap.get(key);
      const poster = vp.poster || tp.poster;
      
      if (!commonPicksMap.has(key)) {
        commonPicksMap.set(key, {
          title: vp.title,
          poster: poster,
          type: vp.type,
          externalId: vp.externalId,
        });
      }

      const combinedRating = (vp.rating || 0) + (tp.rating || 0);
      if (combinedRating > maxCommonRating && poster) {
        maxCommonRating = combinedRating;
        highestRatedCommon = poster;
      }
    }
  });

  const commonPicks = Array.from(commonPicksMap.values()).slice(0, 5); // top 5 common picks

  let headerBackgroundPoster = highestRatedCommon;
  if (!headerBackgroundPoster) {
    let maxViewerRating = -1;
    viewerPosts.forEach(vp => {
      if ((vp.rating || 0) > maxViewerRating && vp.poster) {
        maxViewerRating = vp.rating || 0;
        headerBackgroundPoster = vp.poster;
      }
    });
  }

  const getAvgRating = (posts) => {
    let sum = 0;
    let count = 0;
    posts.forEach(p => {
      if (p.rating > 0) {
        sum += p.rating;
        count++;
      }
    });
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
  };

  const viewerAvgRating = getAvgRating(viewerPosts);
  const targetAvgRating = getAvgRating(targetPosts);

  const getTopGenres = (posts) => {
    const counts = {};
    posts.forEach(p => {
      (p.genres || []).forEach(g => {
        const lower = g.toLowerCase();
        counts[lower] = (counts[lower] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  };

  const viewerTopGenres = getTopGenres(viewerPosts);
  const targetTopGenres = getTopGenres(targetPosts);

  return {
    viewer: {
      name: viewerUser.name.split(" ")[0],
      username: viewerUser.username,
      avatar: viewerUser.avatar,
      watchTime: viewerWatchTime,
      avgRating: viewerAvgRating,
      characters: viewerCharacters,
      topGenres: viewerTopGenres
    },
    target: {
      name: targetUser.name.split(" ")[0],
      username: targetUser.username,
      avatar: targetUser.avatar,
      watchTime: targetWatchTime,
      avgRating: targetAvgRating,
      characters: targetCharacters,
      topGenres: targetTopGenres
    },
    genres: topGenres,
    genreComparison,
    commonPicks,
    commonFavoriteCharacters: viewerCharacters.favorite.filter(vc => 
      targetCharacters.favorite.some(tc => tc.name.toLowerCase() === vc.name.toLowerCase())
    ),
    commonHatedCharacters: viewerCharacters.hated.filter(vc => 
      targetCharacters.hated.some(tc => tc.name.toLowerCase() === vc.name.toLowerCase())
    ),
    tasteMatchPercent: tasteMatch?.percent || null,
    headerBackgroundPoster
  };
};

module.exports = { getComparisonData };
