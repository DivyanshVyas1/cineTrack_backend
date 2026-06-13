const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Post = require('./src/models/Post');
  const types = await Post.distinct('type');
  const mediaTypes = await Post.distinct('mediaType');
  console.log('Distinct types in DB:', types);
  console.log('Distinct mediaTypes in DB:', mediaTypes);
  
  // Find a post that is a show/tv and print its properties
  const possibleShows = await Post.find({ $or: [{ type: 'tv' }, { type: 'show' }, { mediaType: 'tv' }] }).limit(2).lean();
  console.log('Possible shows found:', possibleShows);
  
  // Let's check Pravash's posts specifically, maybe they are different
  const User = require('./src/models/User');
  const user = await User.findOne({ email: /prave/i }).lean();
  if (user) {
    const userPosts = await Post.find({ user: user._id }).select('title type mediaType').limit(10).lean();
    console.log('User posts type check:', userPosts);
  }
  
  mongoose.disconnect();
});
