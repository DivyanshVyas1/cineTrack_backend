const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/jwt");

const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.id).select("isBanned lastActiveAt").lean();
    if (!user || user.isBanned) {
      return res.status(403).json({ success: false, message: "This account is banned or no longer exists." });
    }

    // Update lastActiveAt if more than 5 minutes ago (throttle DB writes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
    if (lastActive < fiveMinutesAgo) {
      await User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } });
    }

    req.user = decoded;
    next();
  } catch (err) {
    next(err); // Pass DB errors to global error handler instead of masking as Invalid token
  }
};

module.exports = authMiddleware;
