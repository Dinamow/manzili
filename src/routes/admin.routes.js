const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const adminController = require('../controllers/admin.controller');

const router = Router();

router.use(auth, requireRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/orders', adminController.listOrders);
router.get('/products', adminController.listProducts);
router.get('/stores', adminController.listStores);
router.post('/stores', adminController.updateStore);
router.get('/reports', adminController.listReports);
router.post('/reports/:id/action', adminController.handleReport);
router.get('/requests', adminController.listRequests);

module.exports = router;
