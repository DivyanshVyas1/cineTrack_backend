const YouTube = require('youtube-sr').default;
const ShortsCache = require('../models/ShortsCache');
const Post = require('../models/Post');
const { incrementYoutubeCalls } = require('../services/analyticsService');
const { getTrendingByType, getTopRatedSongs } = require('../services/discoverAggregateService');

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pickUnique = (arr, n) =>
  shuffleArray([...arr]).slice(0, Math.min(n, arr.length));

const dedupeByTitle = (items) => {
  const seen = new Set();
  return items.filter(p => {
    const rawTitle = p.title?.title || p.title;
    const rawId = p.externalId || p.title?.externalId;
    const key = (rawId || rawTitle || '').toString().toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Build verifyWords array — each word must appear in the YouTube title
const buildVerifyWords = (targetName) => {
  const ARTICLES = new Set(['the','a','an','of','in','is','are','at','to','me','my','and','or','its','be','ka','ki','ke']);
  const words = (targetName || '')
    .replace(/[-_:]/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length >= 2);
  // Keep meaningful words (non-articles), up to 2
  const meaningful = words.filter(w => !ARTICLES.has(w));
  return (meaningful.length > 0 ? meaningful : words).slice(0, 2);
};

// Search YouTube for a Short. Stores up to 8 per cache key for variety.
// seenSet = within-request dedup | excludeIds = session-level already-shown videos
const fetchAndCacheShorts = async ({ query, targetName }, seenSet, excludeIds = new Set()) => {
  const cacheKey = query.toLowerCase();
  const cached = await ShortsCache.findOne({ query: cacheKey });

  if (cached && cached.videoIds.length > 0) {
    // Exclude both session-seen and request-seen IDs
    const available = shuffleArray(
      cached.videoIds.filter(id => !seenSet.has(id) && !excludeIds.has(id))
    );
    if (available.length > 0) {
      seenSet.add(available[0]);
      return [available[0]];
    }
    // If we reach here, we've exhausted the cached items. 
    // We should NOT return []. We should fetch MORE from YouTube, ignoring cached ones.
  }

  try {
    const results = await YouTube.search(query, { limit: 25, type: 'video' });
    incrementYoutubeCalls().catch(() => {});
    // Each word must appear in the title separately (handles "Game of Thrones" → ["game","thrones"])
    const verifyWords = buildVerifyWords(targetName);
    const validVideos = [];

    for (const item of results) {
      if (!item.duration || item.duration > 65000) continue;
      const title = (item.title || '').toLowerCase().replace(/[-_:]/g, ' ');
      // ALL verifyWords must exist somewhere in the YouTube title
      if (verifyWords.length > 0 && !verifyWords.every(w => title.includes(w))) continue;
      
      // Do not add if it's already in excludeIds (seen by user this session)
      if (excludeIds.has(item.id)) continue;
      
      validVideos.push(item.id);
      if (validVideos.length >= 8) break;
    }

    if (validVideos.length > 0) {
      // Append to existing cache instead of replacing, so cache grows over time
      const newCacheList = cached ? Array.from(new Set([...cached.videoIds, ...validVideos])) : validVideos;
      
      await ShortsCache.findOneAndUpdate(
        { query: cacheKey },
        { query: cacheKey, videoIds: newCacheList, lastFetchedAt: Date.now() },
        { upsert: true, new: true }
      );
      const available = shuffleArray(validVideos.filter(id => !seenSet.has(id)));
      if (available.length > 0) {
        seenSet.add(available[0]);
        return [available[0]];
      }
    }
    return [];
  } catch (err) {
    console.error(`[Shorts] Error for "${query}":`, err.message);
    return [];
  }
};

exports.getShortsFeed = async (req, res) => {
  try {
    const userId = req.user?.id;
    const seenSet = new Set(); // within-request dedup only

    // Session-level dedup: frontend sends already-shown video IDs
    const excludeParam = req.query.exclude || '';
    const excludeIds = new Set(excludeParam ? excludeParam.split(',').filter(Boolean) : []);

    console.log(`[Shorts] userId: ${userId || 'GUEST'} | excluding: ${excludeIds.size} seen videos`);

    // ── STEP 1: FETCH USER DATA ──────────────────────────────────────
    // Three clearly separated pools — NO mixing
    let userSeriesPosts  = [];  // type === 'series'
    let userMovieOnlyPosts = []; // type === 'movie'
    let userMusicPosts   = [];  // type === 'music'
    let watchedExternalIds = new Set();
    let topGenres = [];
    let userTopTypes = ['series'];

    if (userId) {
      const userPosts = await Post.find({ user: userId }).lean();
      const genreCounts = {};
      const typeCounts = {};

      userPosts.forEach(p => {
        if (p.externalId) watchedExternalIds.add(p.externalId);
        if (p.genres) p.genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
        typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;

        // Strict separation — no mixing
        if (p.type === 'series') userSeriesPosts.push(p);
        else if (p.type === 'movie') userMovieOnlyPosts.push(p);
        else if (p.type === 'music') userMusicPosts.push(p);
      });

      topGenres = Object.entries(genreCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(e=>e[0]);
      userTopTypes = Object.entries(typeCounts)
        .filter(([t]) => t !== 'music')
        .sort((a,b) => b[1]-a[1])
        .map(([t]) => t);
      if (userTopTypes.length === 0) userTopTypes = ['series'];

      // Shuffle each pool independently
      userSeriesPosts    = dedupeByTitle(shuffleArray(userSeriesPosts));
      userMovieOnlyPosts = dedupeByTitle(shuffleArray(userMovieOnlyPosts));
      userMusicPosts     = dedupeByTitle(shuffleArray(userMusicPosts));

      console.log(`[Shorts] POOLS → series:${userSeriesPosts.length} | movies:${userMovieOnlyPosts.length} | music:${userMusicPosts.length}`);
      console.log(`[Shorts] topTypes:${userTopTypes.join(',')} | topGenres:${topGenres.join(',')}`);
    }

    // ── STEP 2: DISCOVERY (only user's content types & genres) ───────
    let discoveryItems = [];
    if (userId && topGenres.length > 0) {
      const raw = await Post.aggregate([
        {
          $match: {
            visibility: 'public',
            type: { $in: userTopTypes }, // ONLY types user watches
            genres: { $in: topGenres },
            externalId: { $nin: Array.from(watchedExternalIds) }
          }
        },
        {
          $group: {
            _id: '$externalId',
            title: { $first: '$title' },
            type: { $first: '$type' },
            artistName: { $first: '$artistName' },
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        },
        { $addFields: { score: { $multiply: ['$avgRating', { $ln: { $add: ['$count', 1] } }] } } },
        { $match: { count: { $gte: 2 } } },
        { $sort: { score: -1 } },
        { $limit: 20 }
      ]);
      discoveryItems = dedupeByTitle(raw);
      console.log(`[Shorts] discoveryItems=${discoveryItems.length}`);
    }

    // ── STEP 3: WILDCARD ──────────────────────────────────────
    let wildcardItems = [];
    if (!userId) {
      const [tm, ts] = await Promise.all([
        getTrendingByType('movie', 8),
        getTrendingByType('series', 8),
      ]);
      wildcardItems = [...tm, ...ts];
    } else {
      // Always include both series and movies in wildcard, regardless of ratio
      // This ensures users who only added a few series still get to discover new shows
      const fetches = [
        getTrendingByType('series', 8),
      ];
      if (userMovieOnlyPosts.length > 0) {
        fetches.push(getTrendingByType('movie', 8));
      }
      const results = await Promise.all(fetches);
      wildcardItems = results.flat();
    }
    wildcardItems = dedupeByTitle(shuffleArray(wildcardItems));

    // ── STEP 4: BUILD QUERIES ─────────────────────────────────────────
    const cleanTitle = t => (t || '').split('|')[0].split('(')[0].trim();

    const queriesA = []; // User's own watched shows/movies → HIGH PRIORITY
    const queriesC = []; // User's own music
    const queriesB = []; // Discovery (unwatched, same type)
    const queriesW = []; // Wildcard (trending on platform)

    if (userId) {
      // ── SERIES ONLY in Queue A — movies are EXCLUDED from shorts feed ──
      // User has separate series pool, use up to 8 series
      pickUnique(userSeriesPosts, 8).forEach(p => {
        const t = cleanTitle(p.title);
        // Keep "web series shorts" as it's the best query, crashes are intermittent
        if (t) queriesA.push({ query: `${t} web series shorts`, targetName: t });
      });

      // If user has NO series but has movies, fall back to movies
      if (userSeriesPosts.length === 0) {
        pickUnique(userMovieOnlyPosts, 6).forEach(p => {
          const t = cleanTitle(p.title);
          if (t) queriesA.push({ query: `${t} movie shorts`, targetName: t });
        });
      }

      // User's OWN music only — no random songs
      pickUnique(userMusicPosts, 4).forEach(p => {
        const t = cleanTitle(p.title);
        const artist = p.artistName || '';
        if (t) queriesC.push({ query: `${t} ${artist} shorts`.trim(), targetName: t });
      });

      // Discovery: same type (series/movie), never seen, top rated
      pickUnique(discoveryItems, 3).forEach(item => {
        const t = cleanTitle(item.title);
        if (t) {
          const suffix = item.type === 'series' ? 'web series shorts' : 'movie shorts';
          queriesB.push({ query: `${t} ${suffix}`, targetName: t });
        }
      });
    }

    // Wildcard: only 2 for logged-in users, 8 for guest
    pickUnique(wildcardItems, userId ? 2 : 8).forEach(item => {
      const rawT = item.title?.title || item.title;
      const t = rawT ? cleanTitle(rawT) : '';
      if (t) {
        // item.type might be inside item.title.postType for wildcardItems
        const itemType = item.type || item.title?.postType || 'movie';
        const suffix = itemType === 'series' ? 'web series shorts' : 'movie shorts';
        queriesW.push({ query: `${t} ${suffix}`, targetName: t });
      }
    });

    console.log(`[Shorts] queriesA: ${queriesA.map(q=>q.targetName).join(', ') || 'NONE'}`);
    console.log(`[Shorts] queriesB: ${queriesB.map(q=>q.targetName).join(', ') || 'NONE'}`);
    console.log(`[Shorts] queriesW: ${queriesW.map(q=>q.targetName).join(', ') || 'NONE'}`);

    // ── STEP 5: CONCURRENT SEARCH (pass excludeIds for session dedup) ──────
    const [rA, rC, rB, rW] = await Promise.all([
      Promise.all(queriesA.map(q => fetchAndCacheShorts(q, seenSet, excludeIds))),
      Promise.all(queriesC.map(q => fetchAndCacheShorts(q, seenSet, excludeIds))),
      Promise.all(queriesB.map(q => fetchAndCacheShorts(q, seenSet, excludeIds))),
      Promise.all(queriesW.map(q => fetchAndCacheShorts(q, seenSet, excludeIds))),
    ]);

    const aReels = rA.flat(); // User's shows
    const cReels = rC.flat(); // User's music
    const bReels = rB.flat(); // Discovery
    const wReels = rW.flat(); // Wildcard

    console.log(`[Shorts] RESULTS → A:${aReels.length} C:${cReels.length} B:${bReels.length} W:${wReels.length}`);
    console.log(`[Shorts] aReels IDs: ${aReels.join(', ') || 'EMPTY!'}`);

    // ── STEP 6: FEED ASSEMBLY ──────────────────────────────────────────
    // Strategy: Series/User content ALWAYS first so user sees it immediately.
    // Pattern: [Series] [Series] [Music] [Series] [Series] [Music] [Discovery/Wildcard] ...
    const finalFeed = [];

    // First pass: push all user's series/movies content — 100% user content upfront
    // Interleave with 1 music every 2 shows
    let musicIdx = 0;
    for (let i = 0; i < aReels.length; i++) {
      finalFeed.push(aReels[i]);
      // Insert music every 2nd show
      if ((i + 1) % 2 === 0 && musicIdx < cReels.length) {
        finalFeed.push(cReels[musicIdx++]);
      }
    }
    // Any remaining music
    while (musicIdx < cReels.length) finalFeed.push(cReels[musicIdx++]);

    // Second pass: append discovery then wildcard at the end
    bReels.forEach(id => finalFeed.push(id));
    wReels.forEach(id => finalFeed.push(id));

    console.log(`[Shorts] finalFeed length: ${finalFeed.length}`);

    if (finalFeed.length > 0) {
      return res.status(200).json({ success: true, videos: finalFeed, source: 'personalized_v3' });
    }

    return res.status(200).json({
      success: true,
      videos: shuffleArray(['HTvJl71zmf4', 'a3lcGnMhvsA', 'UDVtMYqUAyw', '1ZT6yWl3LPM', 'ng6-j7g7SFY']),
      source: 'offline_fallback'
    });

  } catch (error) {
    console.error('[Shorts] Fatal error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate shorts feed.' });
  }
};
