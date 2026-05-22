const User = require("../models/User");

/**
 * Creates exactly one admin account from environment variables.
 * Skips if an admin already exists.
 */
const ensureAdmin = async () => {
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    if (process.env.ADMIN_PASSWORD) {
      existingAdmin.password = process.env.ADMIN_PASSWORD;
      await existingAdmin.save();
      console.log("Admin password has been reset to match .env");
    }
    return { created: false, message: "Admin account already exists, password synced" };
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "CineTrack Admin";
  const username = process.env.ADMIN_USERNAME || "cinetrack_admin";

  if (!email || !password) {
    return {
      created: false,
      message: "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to bootstrap the single admin account",
    };
  }

  const emailTaken = await User.findOne({ email });
  if (emailTaken) {
    throw new Error("ADMIN_EMAIL is already used by another account");
  }

  await User.create({
    name,
    username,
    email,
    password,
    role: "admin",
  });

  console.log(`Single admin account created for ${email}`);
  return { created: true, message: "Admin account created" };
};

module.exports = ensureAdmin;
