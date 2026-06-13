const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    isPrivate: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isBanned: { type: Boolean, default: false },
    tasteScore: { type: Number, default: 0 },
    favoriteCharacters: [
      {
        name: { type: String, trim: true },
        source: { type: String, trim: true },
      },
    ],
    ganduCharacters: [
      {
        name: { type: String, trim: true },
        source: { type: String, trim: true },
      },
    ],
    achievements: [
      {
        badgeId: { type: String, required: true },
        unlockedAt: { type: Date, default: Date.now },
      },
    ],
    topBadges: [
      {
        trackId: String,
        tierName: String,
        icon: String,
        color: String,
        bg: String,
        border: String,
        glow: String,
      }
    ],
    watchlistCompletions: { type: Number, default: 0 },
    comparedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
