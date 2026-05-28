const { Router } = require('express');
const { auth } = require('../middleware/auth');
const userController = require('../controllers/user.controller');

const router = Router();

router.get('/me', auth, userController.getProfile);
router.patch('/me', auth, userController.updateProfile);
router.get('/me/addresses', auth, userController.listAddresses);
router.post('/me/addresses', auth, userController.createAddress);
router.delete('/me/addresses/:id', auth, userController.deleteAddress);

module.exports = router;
