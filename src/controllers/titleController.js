const asyncHandler = require("../utils/asyncHandler");
const { getTitleDetail } = require("../services/titleDetailService");
const { successResponse } = require("../utils/responseFormatter");

const getDetail = asyncHandler(async (req, res) => {
  const { type, title, externalId } = req.query;
  const data = await getTitleDetail(type, title, externalId, req.user?.id);
  successResponse(res, data, "Title detail fetched");
});

module.exports = { getDetail };
