// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // Production error response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming or unknown errors
  console.error("ERROR 💥", err);
  return res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
};

// Handle Sequelize validation errors
const handleSequelizeValidationError = (err) => {
  const errors = err.errors.map((e) => e.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handle Sequelize unique constraint errors
const handleSequelizeUniqueConstraintError = (err) => {
  const field = err.errors[0].path;
  const message = `${field} already exists. Please use another value.`;
  return new AppError(message, 400);
};

// Handle Sequelize foreign key constraint errors
const handleSequelizeForeignKeyConstraintError = () => {
  return new AppError("Invalid reference to related data", 400);
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError("Invalid token. Please login again.", 401);
};

const handleJWTExpiredError = () => {
  return new AppError("Token expired. Please login again.", 401);
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const err = new AppError(
    `Cannot find ${req.originalUrl} on this server`,
    404
  );
  next(err);
};

// Enhanced error handler with specific error types
const errorHandlerEnhanced = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Handle different types of errors
  if (err.name === "SequelizeValidationError") {
    error = handleSequelizeValidationError(err);
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    error = handleSequelizeUniqueConstraintError(err);
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    error = handleSequelizeForeignKeyConstraintError(err);
  }

  if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }

  if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }

  return errorHandler(error, req, res, next);
};

module.exports = {
  AppError,
  errorHandler,
  errorHandlerEnhanced,
  catchAsync,
  notFound,
};


