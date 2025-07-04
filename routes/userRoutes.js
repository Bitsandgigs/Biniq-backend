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
  submitFeedback,
  getFeedback,
  changePassword,
  deleteAccount,
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
router.post("/feedback", authenticate, ...submitFeedback);
router.get("/feedback", authenticate, getFeedback);
router.post("/change-password", authenticate, ...changePassword);
router.delete("/account", authenticate, ...deleteAccount);

module.exports = router;
