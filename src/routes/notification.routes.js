const { Router } = require('express');
const { auth } = require('../middleware/auth');
const notifController = require('../controllers/notification.controller');

const router = Router();

router.get('/', auth, notifController.list);
router.patch('/:id/read', auth, notifController.markRead);

module.exports = router;
