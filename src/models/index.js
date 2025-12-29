const sequelize = require("../config/database");

const User = require("./User")(sequelize);

const db = {
  sequelize,
  Sequelize: sequelize.Sequelize,
  User,
};

module.exports = db;
