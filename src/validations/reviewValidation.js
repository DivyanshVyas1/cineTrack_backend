const { body } = require("express-validator");

const reviewCreateValidation = [
  body("movie").notEmpty(),
  body("rating").isFloat({ min: 0, max: 10 }),
];

module.exports = { reviewCreateValidation };
