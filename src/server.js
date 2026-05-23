const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");
const ensureAdmin = require("./seed/ensureAdmin");

const PORT = process.env.PORT || 5000;

// For Vercel Serverless execution: attempt to connect/seed async
connectDB().then(() => ensureAdmin()).catch(console.error);

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`CineTrack server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
