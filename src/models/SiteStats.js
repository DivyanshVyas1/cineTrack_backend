const mongoose = require("mongoose");

const siteStatsSchema = new mongoose.Schema({
  visits: { type: Number, default: 0 }
});

module.exports = mongoose.model("SiteStats", siteStatsSchema);
