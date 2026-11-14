import { ApiError } from '../utils/ApiError.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; ');
    return next(new ApiError(400, message));
  }
  req[source] = result.data;
  next();
};
