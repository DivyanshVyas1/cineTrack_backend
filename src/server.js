const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");
const ensureAdmin = require("./seed/ensureAdmin");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await ensureAdmin();
  app.listen(PORT, () => {
    console.log(`CineTrack server running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("\nServer failed to start.");
  process.exit(1);
});
