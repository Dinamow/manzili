const { Router } = require('express');
const { auth } = require('../middleware/auth');
const wishlistController = require('../controllers/wishlist.controller');

const router = Router();

router.get('/', auth, wishlistController.getWishlist);
router.post('/:productId', auth, wishlistController.addToWishlist);
router.delete('/:productId', auth, wishlistController.removeFromWishlist);
router.delete('/', auth, wishlistController.clearWishlist);

module.exports = router;
