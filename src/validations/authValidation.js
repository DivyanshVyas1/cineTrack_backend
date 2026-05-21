const { body } = require("express-validator");

const registerValidation = [
  body("name").notEmpty(),
  body("username").notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
];

const loginValidation = [body("email").isEmail(), body("password").notEmpty()];

module.exports = { registerValidation, loginValidation };
