const express = require("express");
const {
  subscribe,
  getSubscriptions,
  cancelSubscription,
  getSubscriptionTiers,
  updateSubscriptionTiers,
} = require("../controllers/subscriptionController");
const { authenticate } = require("../utils/auth");

const router = express.Router();

router.get("/tiers", authenticate, getSubscriptionTiers);
router.put("/tiers", authenticate, ...updateSubscriptionTiers);
router.post("/subscribe", authenticate, ...subscribe);
router.get("/", authenticate, getSubscriptions);
router.post("/cancel", authenticate, cancelSubscription);

module.exports = router;
