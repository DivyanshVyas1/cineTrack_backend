const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      readPreference: "primary",
    });
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    const hint =
      mongoUri.includes("mongodb+srv://") || mongoUri.includes("mongodb.net")
        ? "\n\nAtlas tip: check internet, cluster is running, and IP whitelist (0.0.0.0/0 for dev). " +
          "If SRV DNS fails, use a standard mongodb:// connection string from Atlas Connect.\n" +
          "Local dev: MONGO_URI=mongodb://127.0.0.1:27017/cinetrack (requires MongoDB installed & running)."
        : "\n\nLocal tip: start MongoDB service, then use MONGO_URI=mongodb://127.0.0.1:27017/cinetrack";

    console.error("MongoDB connection failed:", err.message);
    console.error(hint);
    throw err;
  }
};

module.exports = connectDB;
