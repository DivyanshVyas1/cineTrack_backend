const express = require('express');
const router = express.Router();
const shortsController = require('../controllers/shortsController');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');

// GET /api/shorts/feed?query=searchTerm
router.get('/feed', optionalAuthMiddleware, shortsController.getShortsFeed);

module.exports = router;
