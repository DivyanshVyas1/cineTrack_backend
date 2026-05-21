const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    review: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "resolved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
