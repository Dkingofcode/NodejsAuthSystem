const { AppError } = require("../utils/errors");

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isStrongPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Validate username format
const isValidUsername = (username) => {
  // 3-30 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

// Registration validation
exports.validateRegistration = (req, res, next) => {
  const { email, password, username } = req.body;

  const errors = [];

  // Email validation
  if (!email) {
    errors.push("Email is required");
  } else if (!isValidEmail(email)) {
    errors.push("Invalid email format");
  }

  // Password validation
  if (!password) {
    errors.push("Password is required");
  } else if (!isStrongPassword(password)) {
    errors.push(
      "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
    );
  }

  // Username validation (optional)
  if (username && !isValidUsername(username)) {
    errors.push("Username must be 3-30 characters and contain only letters, numbers, and underscores");
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

// Login validation
exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!email) {
    errors.push("Email is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

// Password update validation
exports.validatePasswordUpdate = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const errors = [];

  if (!currentPassword) {
    errors.push("Current password is required");
  }

  if (!newPassword) {
    errors.push("New password is required");
  } else if (!isStrongPassword(newPassword)) {
    errors.push(
      "New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
    );
  }

  if (currentPassword === newPassword) {
    errors.push("New password must be different from current password");
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

// Password reset validation
exports.validatePasswordReset = (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new AppError("Password is required", 400));
  }

  if (!isStrongPassword(password)) {
    return next(
      new AppError(
        "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
        400
      )
    );
  }

  next();
};

// Profile update validation
exports.validateProfileUpdate = (req, res, next) => {
  const { username, firstName, lastName } = req.body;

  const errors = [];

  if (username !== undefined && !isValidUsername(username)) {
    errors.push("Username must be 3-30 characters and contain only letters, numbers, and underscores");
  }

  if (firstName !== undefined && (firstName.length < 1 || firstName.length > 50)) {
    errors.push("First name must be between 1 and 50 characters");
  }

  if (lastName !== undefined && (lastName.length < 1 || lastName.length > 50)) {
    errors.push("Last name must be between 1 and 50 characters");
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(". "), 400));
  }

  next();
};

// 2FA code validation
exports.validate2FACode = (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return next(new AppError("Verification code is required", 400));
  }

  if (!/^\d{6}$/.test(code) && !/^[0-9a-f]{8}$/.test(code)) {
    return next(new AppError("Invalid verification code format", 400));
  }

  next();
};