require('dotenv').config();
const axios = require('axios');

async function test() {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  console.log('Using API Key:', YOUTUBE_API_KEY ? YOUTUBE_API_KEY.substring(0, 10) + '...' : 'NONE');
  
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `trending movie nostalgia edit shorts`,
        type: 'video',
        videoDuration: 'short',
        order: 'viewCount',
        maxResults: 6,
        key: YOUTUBE_API_KEY
      }
    });
    console.log('Success!', response.data.items.length, 'items');
  } catch (err) {
    console.error('API Error:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

test();
