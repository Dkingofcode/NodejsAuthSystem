const { Sequelize } = require("sequelize");

const env = process.env.NODE_ENV || "development";

const dbName = env === "test" ? process.env.TEST_DB_NAME : process.env.DB_NAME;


const sequelize = new Sequelize(
  dbName,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "postgres",
    logging: false,
  }
);

module.exports = sequelize;
