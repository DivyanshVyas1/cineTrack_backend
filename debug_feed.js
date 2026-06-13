const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const YouTube = require('youtube-sr').default;
  const Post = require('./src/models/Post');
  
  // Simulate what controller does for a specific user
  // Use user 6a0eb823740863f9ed2a5584 (the one with many shows)
  const userId = '6a0eb823740863f9ed2a5584';
  const userPosts = await Post.find({ user: userId }).lean();
  
  console.log('Total posts found for user:', userPosts.length);
  
  const userMoviePosts = userPosts.filter(p => p.type !== 'music');
  const userMusicPosts = userPosts.filter(p => p.type === 'music');
  
  console.log('Movie/Series posts:', userMoviePosts.length);
  console.log('Music posts:', userMusicPosts.length);
  
  // dedupeByTitle
  const dedupeByTitle = (posts) => {
    const seen = new Set();
    return posts.filter(p => {
      const key = (p.externalId || p.title || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  
  const dedupedMovies = dedupeByTitle(userMoviePosts);
  console.log('\nAfter dedupe:', dedupedMovies.length, 'unique movies/shows');
  
  // Pick 4 random
  const shuffled = dedupedMovies.sort(() => 0.5 - Math.random()).slice(0, 4);
  console.log('\nSelected 4 for Query A:');
  shuffled.forEach(p => console.log(' -', p.type, ':', p.title));
  
  // Build verifyWord
  const SKIP_ARTICLES = new Set(['the','a','an','of','in','is','are','at','to','me','my','and','or']);
  const getVerifyWord = (targetName) => {
    const titleWords = (targetName || '')
      .replace(/[-_]/g, ' ')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length >= 2);
    const meaningfulWords = titleWords.filter(w => !SKIP_ARTICLES.has(w));
    return meaningfulWords.slice(0, 2).join(' ') || titleWords.slice(0, 2).join(' ');
  };
  
  // Test actual search for one show
  const testShow = shuffled[0];
  const t = testShow.title.split('|')[0].trim();
  const vw = getVerifyWord(t);
  const query = `${t} badass edit shorts`;
  
  console.log('\n=== Testing actual YouTube search ===');
  console.log('Title:', t);
  console.log('verifyWord:', vw);
  console.log('Query:', query);
  
  const results = await YouTube.search(query, { limit: 25, type: 'video' });
  console.log('Total results from YouTube:', results.length);
  
  let passed = 0, failDuration = 0, failViews = 0, failTitle = 0;
  for (const item of results) {
    if (!item.duration || item.duration > 65000) { failDuration++; continue; }
    if ((item.views || 0) < 5000) { failViews++; continue; }
    const title = (item.title || '').toLowerCase().replace(/[-_]/g, ' ');
    if (vw && !title.includes(vw)) { failTitle++; console.log('  FAIL title check:', item.title, '| verifyWord:', vw); continue; }
    console.log('  PASS:', item.title, '| Views:', item.views, '| Duration:', item.duration, '| ID:', item.id);
    passed++;
    if (passed >= 3) break;
  }
  console.log(`\nResults: ${passed} passed, ${failDuration} failed duration, ${failViews} failed views, ${failTitle} failed title`);
  
  mongoose.disconnect();
});
