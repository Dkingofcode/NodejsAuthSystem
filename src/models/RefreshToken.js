const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      token: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      isRevoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      deviceInfo: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          fields: ["userId"],
        },
        {
          fields: ["token"],
        },
        {
          fields: ["expiresAt"],
        },
      ],
    }
  );

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  // Check if token is valid
  RefreshToken.prototype.isValid = function () {
    return !this.isRevoked && new Date() < this.expiresAt;
  };

  return RefreshToken;
};