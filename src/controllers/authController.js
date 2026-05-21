const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");
const { successResponse } = require("../utils/responseFormatter");

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  successResponse(res, result, "Registered successfully", 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  successResponse(res, result, "Logged in successfully");
});

module.exports = { register, login };
