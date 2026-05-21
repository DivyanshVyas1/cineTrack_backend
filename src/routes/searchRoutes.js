const express = require("express");
const { globalSearch, searchUsers, mediaSearch } = require("../controllers/searchController");

const router = express.Router();

router.get("/users", searchUsers);
router.get("/suggestions", mediaSearch);
router.get("/local", globalSearch);

module.exports = router;
