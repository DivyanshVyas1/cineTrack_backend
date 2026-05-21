const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/jwt");

const optionalAuthMiddleware = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) return next();

  try {
    req.user = jwt.verify(token, jwtSecret);
  } catch {
    /* guest */
  }
  return next();
};

module.exports = optionalAuthMiddleware;
