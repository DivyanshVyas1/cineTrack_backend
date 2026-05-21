const errorMiddleware = (err, _req, res, _next) => {
  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  if (err.name === "ValidationError") statusCode = 400;
  if (err.code === 11000) {
    statusCode = 409;
    if (!err.message || /E11000/i.test(err.message)) {
      const keys = err.keyValue ? Object.keys(err.keyValue) : [];
      if (keys.includes("profileUser") || keys.includes("mediaType")) {
        err.message = "You have already rated this category for this user";
      } else if (keys.includes("post") && keys.includes("user")) {
        err.message = "You have already liked this post";
      } else if (keys.includes("follower") && keys.includes("following")) {
        err.message = "You are already following this user";
      } else {
        err.message = "Duplicate entry already exists";
      }
    }
  }
  if (err.statusCode === 403) statusCode = 403;
  if (err.statusCode === 409) statusCode = 409;
  if (/invalid|not found|already exists|not authorized|only edit/i.test(err.message)) {
    statusCode = statusCode === 500 ? 400 : statusCode;
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = errorMiddleware;
