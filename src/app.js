const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { logger } = require("./utils/logger");
const { errorHandlerEnhanced, notFound } = require("./utils/errors");
//const { sqlSanitize } = require("./middleware/sanitize");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

// Trust proxy - Required for Railway, Heroku, and other reverse proxy platforms
// This allows express-rate-limit to get real client IPs from X-Forwarded-For header
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // Trust first proxy
}

// Security Middleware - Configure Helmet with CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for password reset form
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// SQL injection protection
// app.use(sqlSanitize);

// HTTP request logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { stream: logger.stream }));
}

// Rate limiting
const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use("/api", limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);

// API documentation endpoint (simple version)
app.get("/api", (req, res) => {
  res.json({
    message: "User Authentication API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        refreshToken: "POST /api/auth/refresh-token",
        logout: "POST /api/auth/logout",
        forgotPassword: "POST /api/auth/forgot-password",
        resetPassword: "POST /api/auth/reset-password/:token",
        verifyEmail: "GET /api/auth/verify-email/:token",
        getCurrentUser: "GET /api/auth/me",
        setup2FA: "POST /api/auth/2fa/setup",
        enable2FA: "POST /api/auth/2fa/enable",
        disable2FA: "POST /api/auth/2fa/disable",
      },
      users: {
        updateProfile: "PATCH /api/users/profile",
        updatePassword: "PATCH /api/users/password",
        updateProfilePicture: "PATCH /api/users/profile-picture",
        deleteAccount: "DELETE /api/users/account",
        getSessions: "GET /api/users/sessions",
        revokeSession: "DELETE /api/users/sessions/:sessionId",
        revokeAllSessions: "POST /api/users/sessions/revoke-all",
      },
    },
  });
});

// Handle 404 errors
app.use(notFound);

// Global error handler
app.use(errorHandlerEnhanced);

module.exports = app;