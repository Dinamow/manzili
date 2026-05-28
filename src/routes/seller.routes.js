const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const sellerController = require('../controllers/seller.controller');

const router = Router();

router.get('/dashboard', auth, requireRole('seller'), sellerController.getDashboard);
router.get('/products', auth, requireRole('seller'), sellerController.listProducts);
router.post('/products', auth, requireRole('seller'), sellerController.createProduct);
router.put('/products/:id', auth, requireRole('seller'), sellerController.updateProduct);
router.delete('/products/:id', auth, requireRole('seller'), sellerController.deleteProduct);
router.get('/orders', auth, requireRole('seller'), sellerController.getOrders);
router.patch('/orders/:id/status', auth, requireRole('seller'), sellerController.updateOrderStatus);
router.get('/settings', auth, requireRole('seller'), sellerController.getSettings);
router.put('/settings', auth, requireRole('seller'), sellerController.updateSettings);

// Seller custom requests
const crController = require('../controllers/customRequest.controller');
router.get('/custom-requests', auth, requireRole('seller'), crController.listSellerRequests);

// Seller coupons
const couponController = require('../controllers/coupon.controller');
router.get('/coupons', auth, requireRole('seller'), couponController.listCoupons);
router.post('/coupons', auth, requireRole('seller'), couponController.createCoupon);
router.delete('/coupons/:id', auth, requireRole('seller'), couponController.deleteCoupon);
router.post('/coupon', auth, requireRole('seller'), couponController.validateCoupon);

// Seller wallet
const walletController = require('../controllers/wallet.controller');
router.get('/wallet', auth, requireRole('seller'), walletController.getWallet);
router.post('/wallet/payout', auth, requireRole('seller'), walletController.requestPayout);
router.post('/wallet/bank-details', auth, requireRole('seller'), walletController.updateBankDetails);

// Seller returns
const returnController = require('../controllers/return.controller');
router.get('/returns', auth, requireRole('seller'), returnController.listReturns);
router.post('/orders/:id/return', auth, requireRole('seller'), returnController.processReturn);

module.exports = router;
