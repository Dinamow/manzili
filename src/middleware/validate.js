const { fail } = require('../utils/apiResponse');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return fail(res, 'Validation failed', 400, 'VALIDATION_ERROR');
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
