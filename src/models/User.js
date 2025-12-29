const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

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
    },

    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: true, // OAuth users won’t have passwords
    },

    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },

    authProvider: {
      type: DataTypes.ENUM("local", "google", "github", "wallet"),
      defaultValue: "local",
    },

    googleId: DataTypes.STRING,
    githubId: DataTypes.STRING,

    walletAddress: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },

    twoFactorSecret: DataTypes.STRING,
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    lastLogin: DataTypes.DATE,
  });

  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 12);
    }
  });

  User.beforeUpdate(async (user) => {
    if (user.changed("password")) {
      user.password = await bcrypt.hash(user.password, 12);
    }
  });

  User.prototype.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
  };

  return User;
};
