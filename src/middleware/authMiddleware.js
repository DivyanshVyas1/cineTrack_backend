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
    const user = await User.findById(decoded.id).select("isBanned");
    if (!user || user.isBanned) {
      return res.status(403).json({ success: false, message: "This account is banned or no longer exists." });
    }
    req.user = decoded;
    next();
  } catch (err) {
    next(err); // Pass DB errors to global error handler instead of masking as Invalid token
  }
};

module.exports = authMiddleware;
