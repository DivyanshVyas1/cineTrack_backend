require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const User = require("../src/models/User");
const { evaluateAchievements } = require("../src/services/achievementService");

async function run() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cinetrack");
    console.log("Connected to MongoDB.");

    const users = await User.find({}, "_id username");
    console.log(`Found ${users.length} users. Evaluating achievements...`);

    let totalUnlocked = 0;

    for (const user of users) {
      const newBadges = await evaluateAchievements(user._id);
      if (newBadges.length > 0) {
        console.log(`User ${user.username} unlocked ${newBadges.length} new achievements.`);
        totalUnlocked += newBadges.length;
      }
    }

    console.log(`\nDone! Total ${totalUnlocked} achievements unlocked retroactively.`);
    process.exit(0);
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}

run();
