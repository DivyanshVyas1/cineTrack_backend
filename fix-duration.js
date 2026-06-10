require("dotenv").config();
const mongoose = require("mongoose");
const Post = require("./src/models/Post");
const { getMediaDuration } = require("./src/services/mediaSearchService");

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const posts = await Post.find({ duration: 0, type: { $in: ["movie", "series", "show"] } });
    console.log(`Found ${posts.length} posts with 0 duration`);

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      if (post.externalId) {
        console.log(`Fetching duration for ${post.title}...`);
        const duration = await getMediaDuration(post.externalId, post.type);
        if (duration > 0) {
          post.duration = duration;
          await post.save();
          console.log(`Updated ${post.title} to ${duration} mins`);
        }
      }
      // Small delay to avoid TMDB rate limit
      await new Promise(r => setTimeout(r, 200));
    }

    console.log("Migration complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
