const crService = require('../services/customRequest.service');
const { success } = require('../utils/apiResponse');

async function list(req, res, next) {
  try { return success(res, await crService.listBuyerRequests(req.user.sub)); }
  catch (err) { next(err); }
}
async function create(req, res, next) {
  try { return success(res, await crService.createRequest(req.user.sub, req.body), {}, 201); }
  catch (err) { next(err); }
}
async function getById(req, res, next) {
  try { return success(res, await crService.getRequestById(req.user.sub, req.params.id)); }
  catch (err) { next(err); }
}
async function update(req, res, next) {
  try { return success(res, await crService.updateRequest(req.user.sub, req.params.id, req.body)); }
  catch (err) { next(err); }
}
async function remove(req, res, next) {
  try {
      const result = await crService.deleteRequest(req.user.sub, req.params.id);
      return success(res, null, { message: result.message });
    }
  catch (err) { next(err); }
}
async function listOffers(req, res, next) {
  try { return success(res, await crService.listOffers(req.params.id)); }
  catch (err) { next(err); }
}
async function getActiveOffer(req, res, next) {
  try { return success(res, await crService.getActiveOffer(req.params.id)); }
  catch (err) { next(err); }
}
async function listSellerRequests(req, res, next) {
  try { return success(res, await crService.listSellerRequests(req.user.sub)); }
  catch (err) { next(err); }
}
async function getMessages(req, res, next) {
  try { return success(res, { messages: await crService.getOfferMessages(req.params.id) }); }
  catch (err) { next(err); }
}
async function sendMessage(req, res, next) {
  try { return success(res, await crService.sendOfferMessage(req.user.sub, req.params.id, req.body), {}, 201); }
  catch (err) { next(err); }
}

module.exports = { list, create, getById, update, remove, listOffers, getActiveOffer, listSellerRequests, getMessages, sendMessage };
