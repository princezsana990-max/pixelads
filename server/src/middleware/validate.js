const { sendError } = require('../utils/response');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const formatted = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return sendError(res, 'Validation failed', 400, formatted);
      }
      return sendError(res, 'Invalid request data', 400);
    }
  };
};

module.exports = {
  validate
};
