const { body } = require("express-validator");

const profileUpdateValidation = [body("name").optional().isString(), body("bio").optional().isString()];

module.exports = { profileUpdateValidation };
