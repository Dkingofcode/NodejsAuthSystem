const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { AppError } = require("../utils/errors");

// Authenticate JWT token
exports.authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw new AppError("Access token missing. Please login.", 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a temporary 2FA token
    if (decoded.temp2FA) {
      throw new AppError("Please complete 2FA verification", 401);
    }

    // Find user
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      throw new AppError("User not found. Please login again.", 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError("Account is deactivated. Please contact support.", 403);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Token expired. Please refresh your token.", 401));
    }
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token. Please login again.", 401));
    }
    next(error);
  }
};

// Optional authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

// Check if user is verified
exports.requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return next(
      new AppError("Please verify your email to access this resource", 403)
    );
  }
  next();
};

// Rate limiting per user
const userRequestCounts = new Map();

exports.rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const userRecord = userRequestCounts.get(userId) || { count: 0, resetTime: now + windowMs };

    if (now > userRecord.resetTime) {
      userRecord.count = 0;
      userRecord.resetTime = now + windowMs;
    }

    userRecord.count++;
    userRequestCounts.set(userId, userRecord);

    if (userRecord.count > maxRequests) {
      return next(
        new AppError(
          `Too many requests. Please try again in ${Math.ceil((userRecord.resetTime - now) / 1000)} seconds.`,
          429
        )
      );
    }

    next();
  };
};

// Check if 2FA is required
exports.require2FA = (req, res, next) => {
  if (req.user.twoFactorEnabled && !req.user.twoFactorVerified) {
    return next(
      new AppError("2FA verification required for this action", 403)
    );
  }
  next();
};