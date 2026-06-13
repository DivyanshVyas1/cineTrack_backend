const DailyAnalytics = require("../models/DailyAnalytics");

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const incrementTmdbCalls = async (count = 1) => {
  try {
    const date = getTodayString();
    await DailyAnalytics.updateOne(
      { date },
      { $inc: { apiCallsTmdb: count } },
      { upsert: true }
    );
  } catch (err) {
    console.error("Failed to increment TMDB calls:", err);
  }
};

const incrementYoutubeCalls = async (count = 1) => {
  try {
    const date = getTodayString();
    await DailyAnalytics.updateOne(
      { date },
      { $inc: { apiCallsYoutube: count } },
      { upsert: true }
    );
  } catch (err) {
    console.error("Failed to increment YouTube calls:", err);
  }
};

const incrementTasteMatches = async (count = 1) => {
  try {
    const date = getTodayString();
    await DailyAnalytics.updateOne(
      { date },
      { $inc: { tasteMatches: count } },
      { upsert: true }
    );
  } catch (err) {
    console.error("Failed to increment Taste Matches:", err);
  }
};

module.exports = {
  getTodayString,
  incrementTmdbCalls,
  incrementYoutubeCalls,
  incrementTasteMatches
};
