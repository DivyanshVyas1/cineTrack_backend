const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["movie", "series", "book", "music"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    externalId: { type: String, default: "" },
    artistName: { type: String, default: "" },
    previewUrl: { type: String, default: "" },
    youtubeVideoId: { type: String, default: "" },
    youtubeUrl: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    genres: [{ type: String }],
    poster: { type: String, default: "" },
    rating: { type: Number, min: 0, max: 10 },
    note: { type: String, default: "" },
    isSpoiler: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
  },
  { timestamps: true }
);

postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
