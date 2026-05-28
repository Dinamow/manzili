function success(res, data, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, ...meta });
}

function fail(res, message, statusCode = 400, code = 'ERROR') {
  return res.status(statusCode).json({ success: false, error: { message, code } });
}

module.exports = { success, fail };
