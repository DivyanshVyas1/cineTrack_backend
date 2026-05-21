const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const register = async ({ name, username, email, password }) => {
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) throw new Error("Email or username already exists");

  const user = await User.create({
    name,
    username,
    email,
    password,
    role: "user",
  });
  const safeUser = user.toObject();
  delete safeUser.password;
  const token = generateToken({ id: user._id, role: user.role });
  return { user: safeUser, token };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new Error("Invalid email or password");
  }
  const safeUser = user.toObject();
  delete safeUser.password;
  const token = generateToken({ id: user._id, role: user.role });
  return { user: safeUser, token };
};

module.exports = { register, login };
