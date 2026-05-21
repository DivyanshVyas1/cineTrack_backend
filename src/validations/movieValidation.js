const { body } = require("express-validator");

const movieCreateValidation = [body("title").notEmpty(), body("type").isIn(["movie", "show", "book"])];

module.exports = { movieCreateValidation };
