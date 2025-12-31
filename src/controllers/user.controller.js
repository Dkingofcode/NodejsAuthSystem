const { User } = require("../models");
const { AppError } = require("../utils/errors");

// Unlock account (for development/testing)
exports.unlockAccount = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Unlock the account
    user.isLocked = false;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    res.json({
      status: "success",
      message: "Account unlocked successfully",
      data: {
        email: user.email,
        isLocked: user.isLocked,
        failedLoginAttempts: user.failedLoginAttempts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, username } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Check if username is taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        throw new AppError("Username already taken", 400);
      }
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (username) user.username = username;

    await user.save();

    res.json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Current and new password are required", 400);
    }

    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Update profile picture
exports.updateProfilePicture = async (req, res, next) => {
  try {
    const { profilePicture } = req.body;

    if (!profilePicture) {
      throw new AppError("Profile picture URL is required", 400);
    }

    const user = await User.findByPk(req.user.id);
    user.profilePicture = profilePicture;
    await user.save();

    res.json({
      status: "success",
      message: "Profile picture updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete account
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      throw new AppError("Password is required to delete account", 400);
    }

    const user = await User.findByPk(req.user.id);

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new AppError("Password is incorrect", 401);
    }

    // Soft delete user
    await user.destroy();

    res.json({
      status: "success",
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get user sessions
exports.getSessions = async (req, res, next) => {
  try {
    const { RefreshToken } = require("../models");

    const sessions = await RefreshToken.findAll({
      where: {
        userId: req.user.id,
        isRevoked: false,
        expiresAt: {
          [require("sequelize").Op.gt]: new Date(),
        },
      },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      status: "success",
      data: {
        sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Revoke session
exports.revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { RefreshToken } = require("../models");

    const session = await RefreshToken.findOne({
      where: {
        id: sessionId,
        userId: req.user.id,
      },
    });

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    session.isRevoked = true;
    await session.save();

    res.json({
      status: "success",
      message: "Session revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Revoke all sessions except current
exports.revokeAllSessions = async (req, res, next) => {
  try {
    const { currentRefreshToken } = req.body;
    const { RefreshToken } = require("../models");

    await RefreshToken.update(
      { isRevoked: true },
      {
        where: {
          userId: req.user.id,
          token: {
            [require("sequelize").Op.ne]: currentRefreshToken,
          },
        },
      }
    );

    res.json({
      status: "success",
      message: "All other sessions revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};