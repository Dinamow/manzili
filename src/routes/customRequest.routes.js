const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const crController = require('../controllers/customRequest.controller');

const router = Router();

// Buyer custom requests
router.get('/requests', auth, crController.list);
router.post('/requests', auth, crController.create);
router.get('/requests/:id', auth, crController.getById);
router.put('/requests/:id', auth, crController.update);
router.delete('/requests/:id', auth, crController.remove);
router.get('/requests/:id/offers', auth, crController.listOffers);
router.get('/requests/:id/active-offer', auth, crController.getActiveOffer);

// Offer messages
router.get('/offers/:id/messages', auth, crController.getMessages);
router.post('/offers/:id/messages', auth, crController.sendMessage);

module.exports = router;
