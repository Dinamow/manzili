const { Router } = require('express');
const { auth } = require('../middleware/auth');
const ratingController = require('../controllers/rating.controller');

const router = Router();

router.post('/', auth, ratingController.create);
router.get('/', ratingController.list);

module.exports = router;
