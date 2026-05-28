const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const searchController = require('../controllers/search.controller');

const router = Router();

router.get('/', optionalAuth, searchController.search);

module.exports = router;
