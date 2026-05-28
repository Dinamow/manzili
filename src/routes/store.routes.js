const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const storeController = require('../controllers/store.controller');

const router = Router();

router.post('/apply', auth, storeController.apply);
router.get('/:id', optionalAuth, storeController.getById);
router.get('/:id/products', optionalAuth, storeController.getProducts);

module.exports = router;
