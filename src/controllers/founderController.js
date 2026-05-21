const asyncHandler = require("../utils/asyncHandler");
const FounderSuggestion = require("../models/FounderSuggestion");
const { successResponse } = require("../utils/responseFormatter");

const listFounderSuggestions = asyncHandler(async (_req, res) => {
  const items = await FounderSuggestion.find({ active: true })
    .populate("movie")
    .sort({ rank: 1, createdAt: -1 });
  successResponse(res, items, "Founder suggestions fetched");
});

module.exports = { listFounderSuggestions };
