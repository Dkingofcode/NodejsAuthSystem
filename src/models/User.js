const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");



module.exports = (sequelize) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: {
          msg: "Please provide a valid email address",
        }
      }
    },

    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        len: {
          args: [3, 30],
          msg: "Username must be between 3 and 30 characters",
        },
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: true, // OAuth users won’t have passwords
      validate: {
        len: {
          args: [8, 100],
          msg: "Password must be at least 8 characters",
        },
      },
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    role: {
      type: DataTypes.ENUM("user", "admin", "moderator"),
      defaultValue: "user",
    },

    authProvider: {
      type: DataTypes.ENUM("local", "google", "github", "wallet"),
      defaultValue: "local",
    },

    // OAuth IDs
    googleId: {
       type: DataTypes.STRING,
       unique: true,
       allowNull: true,
    }, 

    githubId: { 
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },


    // Web3 wallet
    walletAddress: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },

    // Email verification
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Password reset
   passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
   },

   passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
   },

    // Two-Factor Authentication
    twoFactorSecret: {  
      type: DataTypes.STRING,
      allowNull: true,
    },


    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    twoFactorBackupCodes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },

    // Account status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },


 isLocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Activity tracking
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      lastPasswordChange: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Refresh token for JWT
      refreshToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      paranoid: true, // Soft delete
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            user.password = await bcrypt.hash(user.password, 12);
            user.lastPasswordChange = new Date();
          }
        },
      },
    }
  );

  // Instance methods
  User.prototype.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
  };

  User.prototype.createEmailVerificationToken = function () {
    const verificationToken = crypto.randomBytes(32).toString("hex");

    this.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return verificationToken;
  };

  User.prototype.isAccountLocked = function () {
    return this.lockedUntil && this.lockedUntil > Date.now();
  };

  User.prototype.incrementFailedLogin = async function () {
    this.failedLoginAttempts += 1;

    if (this.failedLoginAttempts >= 5) {
      this.isLocked = true;
      this.lockedUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
    }

    await this.save();
  };

  User.prototype.resetFailedLogin = async function () {
    this.failedLoginAttempts = 0;
    this.isLocked = false;
    this.lockedUntil = null;
    await this.save();
  };
User.prototype.toJSON = function () {
    const values = { ...this.get() };

    // Remove sensitive fields
    delete values.password;
    delete values.twoFactorSecret;
    delete values.passwordResetToken;
    delete values.emailVerificationToken;
    delete values.refreshToken;
    delete values.twoFactorBackupCodes;

    return values;
  };

  return User;
};
