const mongoose = require("mongoose");

const dailyAnalyticsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: YYYY-MM-DD
  apiCallsTmdb: { type: Number, default: 0 },
  apiCallsYoutube: { type: Number, default: 0 },
  tasteMatches: { type: Number, default: 0 },
});

module.exports = mongoose.model("DailyAnalytics", dailyAnalyticsSchema);
