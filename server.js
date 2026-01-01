require("dotenv").config();
const app = require("./src/app");
const { sequelize } = require("./src/models");
const { logger, logInfo, logError } = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
  logError(err, { type: "unhandledRejection" });
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logError(err, { type: "uncaughtException" });
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logInfo(`${signal} received. Shutting down gracefully...`);
  
  try {
    await sequelize.close();
    logInfo("Database connection closed.");
    process.exit(0);
  } catch (err) {
    logError(err, { context: "graceful shutdown" });
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
(async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logInfo("Database connection established successfully.");

    // Sync database
    // Force sync in production if FORCE_DB_SYNC is set (first deployment)
    // Otherwise use alter in development, skip in production
    if (process.env.FORCE_DB_SYNC === "true") {
      await sequelize.sync({ force: false, alter: true });
      logInfo("Database synchronized (forced).");
    } else if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      logInfo("Database synchronized.");
    } else {
      await sequelize.sync({ alter: false });
      logInfo("Database checked (no sync).");
    }

    // Start listening
    const server = app.listen(PORT, () => {
      logInfo(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logError(new Error(`Port ${PORT} is already in use`));
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        logError(error);
      }
      process.exit(1);
    });
  } catch (err) {
    logError(err, { context: "server startup" });
    console.error("❌ Server failed to start:", err.message);
    process.exit(1);
  }
})();