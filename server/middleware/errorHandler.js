import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('; ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message =
      field === 'vehicle' ? 'This vehicle already has an active entry'
      : field === 'regNumber' ? 'A vehicle with this registration number already exists'
      : field === 'email' ? 'This email is already in use'
      : 'Duplicate record';
  } else if (err.message === 'Not allowed by CORS') {
    status = 403;
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }
  res.status(status).json({ message });
};
