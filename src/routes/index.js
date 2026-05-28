const { Router } = require('express');

const router = Router();

// Auth
router.use('/auth', require('./auth.routes'));

// Products (public)
router.use('/products', require('./product.routes'));

// Search (public)
router.use('/search', require('./search.routes'));

// Wishlist
router.use('/wishlist', require('./wishlist.routes'));

// Orders (buyer)
router.use('/orders', require('./order.routes'));

// User profile & addresses
router.use('/users', require('./user.routes'));

// Public store
router.use('/store', require('./store.routes'));
router.use('/stores', require('./store.routes'));

// Seller
router.use('/seller', require('./seller.routes'));

// Custom requests
router.use('/custom', require('./customRequest.routes'));

// Notifications
router.use('/notifications', require('./notification.routes'));

// Ratings
router.use('/ratings', require('./rating.routes'));

// Admin
router.use('/admin', require('./admin.routes'));

// Upload
router.use('/upload', require('./upload.routes'));

// Checkout & webhooks
router.use('/checkout', require('./checkout.routes'));
router.use('/webhooks', require('./webhook.routes'));

// Bosta proxy
router.use('/bosta', require('./shipping.routes'));
router.use('/shipping', require('./shipping.routes'));

module.exports = router;
