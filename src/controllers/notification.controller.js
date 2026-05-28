const notifService = require('../services/notification.service');
const { success } = require('../utils/apiResponse');

async function list(req, res, next) {
  try { return success(res, await notifService.listNotifications(req.user.sub)); }
  catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
      const result = await notifService.markAsRead(req.user.sub, req.params.id);
      return success(res, null, { message: result.message });
    }
  catch (err) { next(err); }
}

module.exports = { list, markRead };
