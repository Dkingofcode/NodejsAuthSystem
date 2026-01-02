const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const { User, RefreshToken } = require("../models");
const { sendEmail } = require("../utils/email");
const { AppError } = require("../utils/errors");

// Generate JWT tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
};

// Save refresh token to database
const saveRefreshToken = async (userId, token, req) => {
  const decoded = jwt.decode(token);
  
  await RefreshToken.create({
    token,
    userId,
    expiresAt: new Date(decoded.exp * 1000),
    deviceInfo: {
      userAgent: req.headers["user-agent"],
    },
    ipAddress: req.ip,
  });
};

// Register new user
exports.register = async (req, res, next) => {
  try {
    const { email, password, username, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError("Email already in use", 400);
    }

    // Check username if provided
    if (username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        throw new AppError("Username already taken", 400);
      }
    }

    // Create user
    const user = await User.create({
      email,
      password,
      username,
      firstName,
      lastName,
      authProvider: "local",
    });

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validate: false });

    // Send verification email
    try {
      const baseURL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      const verificationURL = `${baseURL}/api/auth/verify-email/${verificationToken}`;
      await sendEmail({
        to: user.email,
        subject: "Verify Your Email",
        html: `
          <h1>Welcome to Our Platform!</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verificationURL}">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationURL}</p>
          <p>This link will expire in 24 hours.</p>
        `,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail registration if email fails
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken, req);

    res.status(201).json({
      status: "success",
      message: "Registration successful. Please verify your email.",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      throw new AppError(
        "Account is locked due to multiple failed login attempts. Please try again later.",
        423
      );
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AppError("Account is deactivated. Please contact support.", 403);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementFailedLogin();
      throw new AppError("Invalid credentials", 401);
    }

    // Reset failed login attempts
    await user.resetFailedLogin();

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = jwt.sign(
        { userId: user.id, temp2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      return res.json({
        status: "success",
        message: "2FA verification required",
        data: {
          requires2FA: true,
          tempToken,
        },
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken, req);

    res.json({
      status: "success",
      message: "Login successful",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Verify 2FA code
exports.verify2FA = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      throw new AppError("Temporary token and code are required", 400);
    }

    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.temp2FA) {
      throw new AppError("Invalid token", 401);
    }

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify 2FA code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!isValid) {
      // Check backup codes
      const backupIndex = user.twoFactorBackupCodes?.indexOf(code);
      if (backupIndex === -1 || backupIndex === undefined) {
        throw new AppError("Invalid verification code", 401);
      }

      // Remove used backup code
      user.twoFactorBackupCodes.splice(backupIndex, 1);
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken, req);

    res.json({
      status: "success",
      message: "2FA verification successful",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Refresh access token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in database
    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken },
      include: [{ model: User, as: "user" }],
    });

    if (!storedToken || !storedToken.isValid()) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken(storedToken.user);

    res.json({
      status: "success",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke refresh token
      await RefreshToken.update(
        { isRevoked: true },
        { where: { token: refreshToken } }
      );
    }

    res.json({
      status: "success",
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

// Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const user = await User.findOne({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        status: "success",
        message: "If an account exists, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validate: false });

    // Send email
    try {
      const baseURL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      const resetURL = `${baseURL}/api/auth/reset-password/${resetToken}`;
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <h1>Password Reset</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetURL}">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetURL}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
    } catch (emailError) {
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save({ validate: false });
      throw new AppError("Error sending email. Please try again later.", 500);
    }

    res.json({
      status: "success",
      message: "If an account exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      throw new AppError("Password is required", 400);
    }

    // Hash token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [require("sequelize").Op.gt]: Date.now() },
      },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    // Update password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Revoke all refresh tokens for security
    await RefreshToken.update(
      { isRevoked: true },
      { where: { userId: user.id } }
    );

    res.json({
      status: "success",
      message: "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

// Verify email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Hash token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { [require("sequelize").Op.gt]: Date.now() },
      },
    });

    if (!user) {
      throw new AppError("Invalid or expired verification token", 400);
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({
      status: "success",
      message: "Email verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Setup 2FA
exports.setup2FA = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user.twoFactorEnabled) {
      throw new AppError("2FA is already enabled", 400);
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${process.env.TWO_FACTOR_APP_NAME} (${user.email})`,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex")
    );

    // Save secret (but don't enable yet)
    user.twoFactorSecret = secret.base32;
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    res.json({
      status: "success",
      data: {
        secret: secret.base32,
        qrCode,
        backupCodes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Enable 2FA
exports.enable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError("Verification code is required", 400);
    }

    const user = await User.findByPk(req.user.id);

    if (!user.twoFactorSecret) {
      throw new AppError("2FA setup not initiated", 400);
    }

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!isValid) {
      throw new AppError("Invalid verification code", 401);
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      status: "success",
      message: "2FA enabled successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Disable 2FA
exports.disable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError("Verification code is required", 400);
    }

    const user = await User.findByPk(req.user.id);

    if (!user.twoFactorEnabled) {
      throw new AppError("2FA is not enabled", 400);
    }

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!isValid) {
      throw new AppError("Invalid verification code", 401);
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({
      status: "success",
      message: "2FA disabled successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    res.json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Resend verification email
exports.resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError("No account found with this email", 404);
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.json({
        status: "success",
        message: "Email is already verified",
      });
    }

    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validate: false });

    // Send verification email
    try {
      const baseURL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      const verificationURL = `${baseURL}/api/auth/verify-email/${verificationToken}`;
      
      await sendEmail({
        to: user.email,
        subject: "Verify Your Email Address",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
                margin: 20px 0;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 12px;
                margin-top: 20px;
              }
              .info-box {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📧 Email Verification</h1>
              </div>
              <div class="content">
                <h2>Hello ${user.firstName || user.username || 'there'}!</h2>
                <p>You requested to verify your email address for your account.</p>
                
                <p>Click the button below to verify your email:</p>
                
                <center>
                  <a href="${verificationURL}" class="button">Verify Email Address</a>
                </center>
                
                <div class="info-box">
                  <strong>⏰ This link will expire in 24 hours</strong><br>
                  If you didn't request this, you can safely ignore this email.
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">
                  ${verificationURL}
                </p>
                
                <p>After verification, you'll be able to access all features including Web3 capabilities!</p>
              </div>
              <div class="footer">
                <p>This is an automated message, please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.TWO_FACTOR_APP_NAME || 'User Auth System'}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Hello ${user.firstName || user.username || 'there'}!
          
          You requested to verify your email address.
          
          Click this link to verify: ${verificationURL}
          
          This link will expire in 24 hours.
          
          If you didn't request this, you can safely ignore this email.
        `,
      });

      res.json({
        status: "success",
        message: "Verification email sent successfully. Please check your inbox.",
      });
    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError);
      throw new AppError("Failed to send verification email. Please try again later.", 500);
    }
  } catch (error) {
    next(error);
  }
};