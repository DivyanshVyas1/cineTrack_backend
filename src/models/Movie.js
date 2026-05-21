const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["movie", "show", "book", "music"], required: true },
    overview: { type: String, default: "" },
    poster: { type: String, default: "" },
    backdrop: { type: String, default: "" },
    genres: [{ type: String }],
    releaseDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

movieSchema.index({ title: "text", overview: "text" });
module.exports = mongoose.model("Movie", movieSchema);
