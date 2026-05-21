const mongoose = require("mongoose");

const userListEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
    listType: { type: String, enum: ["watchlist", "favorite"], required: true },
  },
  { timestamps: true }
);

userListEntrySchema.index({ user: 1, movie: 1, listType: 1 }, { unique: true });

module.exports = mongoose.model("UserListEntry", userListEntrySchema);
