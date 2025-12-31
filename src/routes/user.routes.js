const express = require("express");
const {
  updateProfile,
  updatePassword,
  updateProfilePicture,
  deleteAccount,
  getSessions,
  revokeSession,
  revokeAllSessions,
  unlockAccount,
} = require("../controllers/user.controller");
const {
  authenticateToken,
  requireEmailVerification,
} = require("../middleware/auth");
const {
  validateProfileUpdate,
  validatePasswordUpdate,
} = require("../middleware/validation");

const router = express.Router();

// Public routes (no authentication required)
// ⚠️ WARNING: In production, this should be admin-only or removed!
router.post("/unlock-account", unlockAccount);

// All other routes require authentication
router.use(authenticateToken);

// Profile management
router.patch("/profile", validateProfileUpdate, updateProfile);
router.patch("/password", validatePasswordUpdate, updatePassword);
router.patch("/profile-picture", updateProfilePicture);
router.delete("/account", deleteAccount);

// Session management
router.get("/sessions", getSessions);
router.delete("/sessions/:sessionId", revokeSession);
router.post("/sessions/revoke-all", revokeAllSessions);

module.exports = router;