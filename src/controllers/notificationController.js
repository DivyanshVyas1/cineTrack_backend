const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/responseFormatter");

const listNotifications = asyncHandler(async (_req, res) => {
  successResponse(res, [], "Notifications fetched");
});

module.exports = { listNotifications };
