const mongoose = require('mongoose');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid resource identifier',
      },
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: Object.values(err.errors).map((item) => ({
          message: item.message,
          path: item.path,
        })),
      },
    });
  }

  if (err.code === 23505 || err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        message: 'Duplicate resource',
      },
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired authentication token',
      },
    });
  }

  const statusCode = err.statusCode || err.status || 500;

  return res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = errorHandler;
