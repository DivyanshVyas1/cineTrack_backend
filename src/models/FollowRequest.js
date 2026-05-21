const mongoose = require("mongoose");

const followRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

followRequestSchema.index({ requester: 1, target: 1 }, { unique: true });
followRequestSchema.index({ target: 1, status: 1 });

module.exports = mongoose.model("FollowRequest", followRequestSchema);
