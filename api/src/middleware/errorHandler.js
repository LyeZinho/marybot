export function errorHandler(err, req, res, next) {
  console.error('API Error:', err);

  // Default error
  let error = {
    status: 500,
    message: 'Internal Server Error'
  };

  // Prisma errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        error = {
          status: 400,
          message: 'Duplicate entry - Record already exists',
          field: err.meta?.target
        };
        break;
      case 'P2025':
        error = {
          status: 404,
          message: 'Record not found'
        };
        break;
      case 'P2003':
        error = {
          status: 400,
          message: 'Foreign key constraint violation'
        };
        break;
      default:
        error = {
          status: 500,
          message: 'Database error'
        };
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = {
      status: 400,
      message: 'Validation error',
      details: err.details
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      status: 401,
      message: 'Invalid token'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      status: 401,
      message: 'Token expired'
    };
  }

  // Custom API errors
  if (err.status) {
    error = {
      status: err.status,
      message: err.message
    };
  }

  // Send error response
  res.status(error.status).json({
    error: true,
    message: error.message,
    ...(error.field && { field: error.field }),
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}