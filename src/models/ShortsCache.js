const mongoose = require('mongoose');

const shortsCacheSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  videoIds: [{
    type: String
  }],
  lastFetchedAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Cache expires after 7 days
shortsCacheSchema.index({ lastFetchedAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('ShortsCache', shortsCacheSchema);
