const request = require("supertest");
const app = require("../../src/app");
const { sequelize, User } = require("../../src/models");
const { createTestUser } = require("./factories/userFactory");

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("Authentication API", () => {
  describe("POST /api/auth/register", () => {
    it("creates a user and returns token", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "newuser@example.com", password: "Password123!", username: "NewUser" });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe("newuser@example.com");
    });

    it("rejects duplicate emails", async () => {
      await createTestUser({ email: "duplicate@example.com" });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "duplicate@example.com", password: "Password123!" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Email already in use");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeAll(async () => {
      await createTestUser({ email: "loginuser@example.com", password: "LoginPass123!" });
    });

    it("logs in with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "loginuser@example.com", password: "LoginPass123!" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe("loginuser@example.com");
    });

    it("rejects wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "loginuser@example.com", password: "WrongPass!" });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("rejects non-existent user", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "notfound@example.com", password: "AnyPass123!" });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });
  });
});
