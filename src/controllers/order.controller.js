const orderService = require('../services/order.service');
const { success } = require('../utils/apiResponse');

async function createOrder(req, res, next) {
  try {
    const data = await orderService.createOrder(req.user.sub, req.body);
    return success(res, data, {}, 201);
  } catch (err) { next(err); }
}

async function listOrders(req, res, next) {
  try {
    const result = await orderService.listOrders(req.user.sub);
    return success(res, { orders: result.orders }, { total: result.total });
  } catch (err) { next(err); }
}

async function getOrderById(req, res, next) {
  try {
    const data = await orderService.getOrderById(req.user.sub, req.params.id);
    return success(res, data);
  } catch (err) { next(err); }
}

module.exports = { createOrder, listOrders, getOrderById };
