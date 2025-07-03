const express = require("express");
const {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  verifyOTP,
  resetPassword,
  subscribe,
  getSubscription,
  cancelSubscription,
} = require("../controllers/userController");
const { authenticate } = require("../utils/auth");

const router = express.Router();

router.post("/register", ...register);
router.post("/login", ...login);
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, ...updateProfile);
router.post("/forgot-password", ...forgotPassword);
router.post("/verify-otp", ...verifyOTP);
router.post("/reset-password", ...resetPassword);
router.post("/subscribe", authenticate, ...subscribe);
router.get("/subscription", authenticate, getSubscription);
router.post("/cancel-subscription", authenticate, cancelSubscription);

module.exports = router;
