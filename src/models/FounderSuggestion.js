const mongoose = require("mongoose");

const founderSuggestionSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
    note: { type: String, required: true },
    active: { type: Boolean, default: true },
    rank: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FounderSuggestion", founderSuggestionSchema);
