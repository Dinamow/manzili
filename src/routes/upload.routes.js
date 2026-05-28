const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const uploadController = require('../controllers/upload.controller');

const router = Router();

router.post('/', auth, upload.single('image'), uploadController.uploadImage);

module.exports = router;
