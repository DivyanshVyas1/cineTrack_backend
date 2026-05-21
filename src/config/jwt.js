module.exports = {
  jwtSecret: process.env.JWT_SECRET || "replace_me",
  jwtExpire: process.env.JWT_EXPIRE || "7d",
};
