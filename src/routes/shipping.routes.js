const { Router } = require('express');
const { auth } = require('../middleware/auth');
const shippingController = require('../controllers/shipping.controller');

const router = Router();

router.get('/cities', auth, shippingController.listCities);
router.get('/cities/:cityId/zones', auth, shippingController.listZones);
router.get('/cities/:cityId/districts', auth, shippingController.listDistricts);
router.post('/estimate', auth, shippingController.estimate);

module.exports = router;
