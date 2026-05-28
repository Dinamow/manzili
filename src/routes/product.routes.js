const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const productController = require('../controllers/product.controller');

const router = Router();

router.get('/', optionalAuth, productController.listProducts);
router.get('/featured', optionalAuth, productController.listFeatured);
router.get('/latest', optionalAuth, productController.listLatest);
router.get('/:id', optionalAuth, productController.getById);

module.exports = router;
