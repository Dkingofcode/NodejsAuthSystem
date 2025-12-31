const winston = require("winston");
const path = require("path");

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define custom format for console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    ({ timestamp, level, message, ...metadata }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
      }
      return msg;
    }
  )
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "user-auth-service" },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create a stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Helper functions
const logError = (error, context = {}) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

const logInfo = (message, context = {}) => {
  logger.info({
    message,
    ...context,
  });
};

const logWarning = (message, context = {}) => {
  logger.warn({
    message,
    ...context,
  });
};

const logDebug = (message, context = {}) => {
  logger.debug({
    message,
    ...context,
  });
};

module.exports = {
  logger,
  logError,
  logInfo,
  logWarning,
  logDebug,
};