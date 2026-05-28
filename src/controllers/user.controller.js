const userService = require('../services/user.service');
const addressService = require('../services/address.service');
const { success } = require('../utils/apiResponse');

async function getProfile(req, res, next) {
  try {
    const data = await userService.getProfile(req.user.sub);
    return success(res, data);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const data = await userService.updateProfile(req.user.sub, req.body);
    return success(res, data);
  } catch (err) { next(err); }
}

async function listAddresses(req, res, next) {
  try {
    const data = await addressService.listAddresses(req.user.sub);
    return success(res, { addresses: data });
  } catch (err) { next(err); }
}

async function createAddress(req, res, next) {
  try {
    const data = await addressService.createAddress(req.user.sub, req.body);
    return success(res, data, {}, 201);
  } catch (err) { next(err); }
}

async function deleteAddress(req, res, next) {
  try {
    await addressService.deleteAddress(req.user.sub, req.params.id);
    return success(res, null, { message: 'Address removed' });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, listAddresses, createAddress, deleteAddress };
