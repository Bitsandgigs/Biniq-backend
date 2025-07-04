const { check, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Notification = require("../models/Notification");
const Plan = require("../models/Plan");
const { sendMail } = require("../utils/mailer");

const getSubscriptionTiers = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.role !== 1 && user.role !== 2)
      return res
        .status(403)
        .json({
          success: false,
          message: "Only admins and resellers can access this endpoint",
        });

    const query = user.role === 1 ? {} : { type: "reseller" };
    const plans = await Plan.find(query).select("type tier amount duration");
    const formattedPlans = {
      reseller: {},
      store_owner: {},
    };
    plans.forEach((plan) => {
      formattedPlans[plan.type][plan.tier] = {
        amount: plan.amount,
        duration: plan.duration,
      };
    });

    if (user.role === 2) delete formattedPlans.store_owner;

    res.json({
      success: true,
      data: formattedPlans,
    });
  } catch (error) {
    console.error("Get subscription tiers error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const updateSubscriptionTiers = [
  check("tiers").isArray().withMessage("Tiers must be an array"),
  check("tiers.*.type")
    .isIn(["reseller", "store_owner"])
    .withMessage("Type must be reseller or store_owner"),
  check("tiers.*.tier")
    .isIn(["tier1", "tier2", "tier3"])
    .withMessage("Tier must be tier1, tier2, or tier3"),
  check("tiers.*.amount")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a non-negative number"),
  check("tiers.*.duration")
    .isInt({ min: 1 })
    .withMessage("Duration must be a positive integer"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { tiers } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 1)
      return res
        .status(403)
        .json({ success: false, message: "Only admins can update tiers" });

    try {
      for (const tier of tiers) {
        await Plan.updateOne(
          { type: tier.type, tier: tier.tier },
          {
            $set: {
              amount: tier.amount,
              duration: tier.duration,
              updated_at: Date.now(),
            },
          },
          { upsert: true }
        );
      }

      const updatedPlans = await Plan.find().select(
        "type tier amount duration"
      );
      const formattedPlans = {
        reseller: {},
        store_owner: {},
      };
      updatedPlans.forEach((plan) => {
        formattedPlans[plan.type][plan.tier] = {
          amount: plan.amount,
          duration: plan.duration,
        };
      });

      res.json({
        success: true,
        message: "Subscription tiers updated successfully",
        data: formattedPlans,
      });
    } catch (error) {
      console.error("Update subscription tiers error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error",
          error: error.message,
        });
    }
  },
];

const subscribe = [
  check("plan")
    .isIn(["tier1", "tier2", "tier3"])
    .withMessage("Plan must be tier1, tier2, or tier3"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { plan } = req.body;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === 1)
        return res.status(403).json({ message: "Admins cannot subscribe" });

      const type = user.role === 2 ? "reseller" : "store_owner";
      const planConfig = await Plan.findOne({ type, tier: plan });
      if (!planConfig)
        return res.status(400).json({ message: "Invalid plan for user type" });

      const paymentStatus = "completed";
      const subscription = new Subscription({
        _id: uuidv4(),
        order_id: uuidv4(),
        user_id: userId,
        user_name: user.full_name,
        type,
        plan,
        amount: planConfig.amount,
        status: paymentStatus,
        duration: planConfig.duration,
      });
      await subscription.save();

      user.subscription = subscription._id;
      await user.save();

      const notification = new Notification({
        _id: uuidv4(),
        user_id: userId,
        message: `Subscribed to ${plan} plan successfully.`,
        type,
      });
      await notification.save();
      await sendMail(
        user.email,
        "Subscription Confirmation",
        `You have subscribed to the ${plan} plan.`
      );

      res.json({
        message: `Subscribed to ${plan} plan successfully`,
        subscription,
      });
    } catch (error) {
      console.error("Subscribe error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

const getSubscriptions = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const subscriptions = await Subscription.find({ user_id: user._id });
    res.json(subscriptions);
  } catch (error) {
    console.error("Get subscriptions error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === 1)
      return res
        .status(403)
        .json({ message: "Admins cannot cancel subscriptions" });
    if (!user.subscription)
      return res.status(400).json({ message: "No active subscription" });

    const subscription = await Subscription.findById(user.subscription);
    if (!subscription)
      return res.status(404).json({ message: "Subscription not found" });

    subscription.status = "failed";
    await subscription.save();

    user.subscription = null;
    await user.save();

    const type = user.role === 2 ? "reseller" : "store_owner";
    const notification = new Notification({
      _id: uuidv4(),
      user_id: user._id,
      message: "Your subscription has been cancelled.",
      type,
    });
    await notification.save();
    await sendMail(
      user.email,
      "Subscription Cancelled",
      "Your subscription has been cancelled."
    );

    res.json({ message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getSubscriptionTiers,
  updateSubscriptionTiers,
  subscribe,
  getSubscriptions,
  cancelSubscription,
};
