const jwt = require("jsonwebtoken");
const { User } = require("../models");

const generateToken = (user) =>
  jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

exports.register = async (req, res) => {
  const { email, password, username } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: "Email already in use" });
  }

  const user = await User.create({
    email,
    password,
    username,
    authProvider: "local",
  });

  const token = generateToken(user);

  res.status(201).json({ token, user });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user || !user.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user);
  res.json({ token, user });
};
