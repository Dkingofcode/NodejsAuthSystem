const { User } = require("../../../src/models");

exports.createTestUser = async (overrides = {}) => {
  return await User.create({
    email: overrides.email || "test@example.com",
    password: overrides.password || "Password123!",
    username: overrides.username || "TestUser",
    authProvider: "local",
  });
};
