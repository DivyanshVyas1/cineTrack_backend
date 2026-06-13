const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const founderRoutes = require("./routes/founderRoutes");
const searchRoutes = require("./routes/searchRoutes");
const discoverRoutes = require("./routes/discoverRoutes");
const titleRoutes = require("./routes/titleRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const shortsRoutes = require("./routes/shortsRoutes");
const notFoundMiddleware = require("./middleware/notFoundMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow localhost and any vercel deployment URL
      if (
        origin.startsWith("http://localhost:") ||
        origin.endsWith("vercel.app") ||
        origin === process.env.CLIENT_URL
      ) {
        return callback(null, true);
      }
      
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "CineTrack API is running" });
});

const connectDB = require("./config/db");
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/founder-suggestions", founderRoutes);
const { mediaSearch: searchMedia } = require("./controllers/searchController");
app.get("/api/search", searchMedia);
app.use("/api/search", searchRoutes);
app.use("/api/titles", titleRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/shorts", shortsRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
