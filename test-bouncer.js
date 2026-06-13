require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

async function test() {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  console.log('Using API Key:', YOUTUBE_API_KEY ? YOUTUBE_API_KEY.substring(0, 10) + '...' : 'NONE');
  
  const query = "Interstellar viral moments OR best scenes most viewed #shorts";
  const safeQuery = `${query} -gameplay -reaction -"full episode" -trailer`;
  const targetName = "Interstellar";
  
  try {
    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: safeQuery,
        type: 'video',
        videoDuration: 'short',
        order: 'viewCount',
        maxResults: 10,
        key: YOUTUBE_API_KEY
      }
    });

    const searchItems = searchRes.data.items || [];
    console.log(`Found ${searchItems.length} items from search API`);
    if (searchItems.length === 0) return;

    const videoIds = searchItems.map(item => item.id.videoId).filter(id => id);

    const videoRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics',
        id: videoIds.join(','),
        key: YOUTUBE_API_KEY
      }
    });

    const validVideos = [];
    const targetLower = (targetName || '').toLowerCase().trim();

    for (const vid of (videoRes.data.items || [])) {
      const views = parseInt(vid.statistics?.viewCount || '0', 10);
      const title = (vid.snippet?.title || '').toLowerCase();
      const desc = (vid.snippet?.description || '').toLowerCase();
      const textToSearch = title + ' ' + desc;
      
      console.log(`\nTesting video: ${vid.id}`);
      console.log(`Title: ${vid.snippet?.title}`);
      console.log(`Views: ${views}`);
      console.log(`Has #shorts? ${textToSearch.includes('#shorts')}`);
      console.log(`Has target "${targetLower}"? ${textToSearch.includes(targetLower)}`);
      
      if (views < 100000) {
        console.log('REJECTED: Low views');
        continue;
      }
      if (targetLower && !textToSearch.includes(targetLower)) {
        console.log('REJECTED: No keyword match');
        continue;
      }
      if (!textToSearch.includes('#shorts')) {
        console.log('REJECTED: No #shorts tag');
        continue;
      }
      
      console.log('ACCEPTED!');
      validVideos.push(vid.id);
    }
    
    console.log(`\nFinal valid videos: ${validVideos.length}`);
  } catch (err) {
    console.error('API Error:', err.response?.data || err.message);
  }
}

test();
