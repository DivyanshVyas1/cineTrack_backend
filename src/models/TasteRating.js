const mongoose = require("mongoose");

const tasteRatingSchema = new mongoose.Schema(
  {
    profileUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rater: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaType: { type: String, enum: ["movie", "show", "book"], required: true },
    score: { type: Number, min: 0, max: 10, required: true },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

tasteRatingSchema.index({ profileUser: 1, rater: 1, mediaType: 1 }, { unique: true });

module.exports = mongoose.model("TasteRating", tasteRatingSchema);
