const { Router } = require('express');
const { auth } = require('../middleware/auth');
const orderController = require('../controllers/order.controller');

const router = Router();

router.post('/', auth, orderController.createOrder);
router.get('/', auth, orderController.listOrders);
router.get('/:id', auth, orderController.getOrderById);

module.exports = router;
