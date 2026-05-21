const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpire } = require("../config/jwt");

const generateToken = (payload) => jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire });

module.exports = generateToken;
