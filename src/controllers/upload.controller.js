const uploadService = require('../services/upload.service');
const { success } = require('../utils/apiResponse');

async function uploadImage(req, res, next) {
  try {
    const data = await uploadService.uploadImage(req.file);
    return success(res, data, {}, 201);
  } catch (err) { next(err); }
}

module.exports = { uploadImage };
