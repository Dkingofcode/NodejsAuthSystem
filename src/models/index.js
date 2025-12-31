const sequelize = require("../config/database");

const User = require("./User")(sequelize);
const RefreshToken = require("./RefreshToken")(sequelize);


// Define associations
User.hasMany(RefreshToken, {
  foreignKey: "userId",
  as: "refreshTokens",
});

RefreshToken.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});



const db = {
  sequelize,
  Sequelize: sequelize.Sequelize,
  User,
  RefreshToken,
};

module.exports = db;
