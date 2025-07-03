const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const Store = require("../models/Store");
const { sendMail } = require("../utils/mailer");

// Initialize fixed admin user on server startup
const initializeAdmin = async () => {
  try {
    const adminEmail = "admin@binIQ.com";
    const adminPassword = "Admin@123"; // Change in production or use env variable
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = new User({
        _id: uuidv4(),
        full_name: "Admin User",
        email: adminEmail,
        password: hashedPassword,
        role: 1, // Admin
        subscription: "free", // Admin gets free access
      });
      await admin.save();
      console.log("Admin user created:", adminEmail);
    }
  } catch (error) {
    console.error("Failed to initialize admin user:", error);
  }
};

// Run admin initialization
initializeAdmin();

const register = [
  check("full_name").notEmpty().withMessage("Full name is required"),
  check("email").isEmail().withMessage("Valid email is required"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  check("confirm_password")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
  check("role")
    .isIn([1, 2, 3])
    .withMessage("Role must be 1 (Admin), 2 (Reseller), or 3 (Store Owner)"),
  check("store_name")
    .if((value, { req }) => req.body.role === 3)
    .notEmpty()
    .withMessage("Store name is required for Store Owner"),
  check("dob")
    .if((value, { req }) => req.body.role === 2)
    .notEmpty()
    .isISO8601()
    .withMessage("Valid date of birth is required for Reseller"),
  check("gender")
    .if((value, { req }) => req.body.role === 2)
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other for Reseller"),
  check("phone_number")
    .if((value, { req }) => req.body.role === 2)
    .notEmpty()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Valid phone number is required for Reseller"),
  check("address")
    .if((value, { req }) => req.body.role === 2)
    .notEmpty()
    .withMessage("Address is required for Reseller"),
  check("card_information.card_number")
    .if((value, { req }) => req.body.role === 2)
    .notEmpty()
    .matches(/^\d{16}$/)
    .withMessage("Card number must be 16 digits for Reseller"),
  check("card_information.cardholder_name")
    .if((value, { req }) => req.body.role === 2)
    .notEmpty()
    .withMessage("Cardholder name is required for Reseller"),
  check("card_information.expiry_month")
    .if((value, { req }) => req.body.role === 2)
    .notEmpty()
    .matches(/^(0[1-9]|1[0-2])$/)
    .withMessage("Valid expiry month (01-12) is required for Reseller"),
  check("card_information.expiry_year")
    .if((value, { req }) => req.body.role === 2)
    .notEmpty()
    .matches(/^\d{4}$/)
    .withMessage("Valid expiry year is required for Reseller"),
  check("card_information.cvc")
    .if((value, { req }) => req.body.role === 2)
    .notEmpty()
    .matches(/^\d{3,4}$/)
    .withMessage("Valid CVC (3-4 digits) is required for Reseller"),
  check("expertise_level")
    .if((value, { req }) => req.body.role === 2)
    .isIn(["beginner", "intermediate", "expert"])
    .withMessage(
      "Expertise level must be beginner, intermediate, or expert for Reseller"
    ),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors
        .array()
        .map((err) => err.msg)
        .join(", ");
      return res.status(400).json({ success: false, error: errorMessages });
    }

    const {
      full_name,
      store_name,
      email,
      password,
      role,
      dob,
      gender,
      phone_number,
      address,
      card_information,
      expertise_level,
      profile_image,
    } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res
          .status(400)
          .json({ success: false, message: "Email already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        _id: uuidv4(),
        full_name,
        store_name: role === 3 ? store_name : null,
        email,
        password: hashedPassword,
        role,
        dob: role === 2 ? new Date(dob) : null,
        gender: role === 2 ? gender : null,
        phone_number: role === 2 ? phone_number : null,
        address: role === 2 ? address : null,
        card_information: role === 2 ? card_information : {},
        expertise_level: role === 2 ? expertise_level : null,
        profile_image: role === 2 ? profile_image : null,
        subscription: "free",
      });
      await user.save();

      // Create default store for Store Owner (role: 3)
      if (role === 3) {
        const existingStore = await Store.findOne({ user_id: user._id });
        if (existingStore) {
          return res
            .status(400)
            .json({
              success: false,
              message: "Store already exists for this user",
            });
        }

        const store = new Store({
          _id: uuidv4(),
          user_id: user._id,
          store_name,
          user_latitude: null,
          user_longitude: null,
          address: null,
          favorited_by: [],
          liked_by: [],
          followed_by: [],
          comments: [],
        });
        await store.save();
      }

      res
        .status(201)
        .json({
          success: true,
          user_id: user._id,
          message: "User registered successfully",
        });
    } catch (error) {
      console.error("Registration error:", error);
      res
        .status(500)
        .json({
          message: "Server error",
          error: error.message,
          success: false,
        });
    }
  },
];

const login = [
  check("email").isEmail().withMessage("Valid email is required"),
  check("password").notEmpty().withMessage("Password is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ message: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });
      res.json({ token, user_details: user });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -card_information"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateProfile = [
  check("full_name")
    .optional()
    .notEmpty()
    .withMessage("Full name cannot be empty"),
  check("store_name")
    .if((value, { req }) => req.body.role === 3)
    .optional()
    .notEmpty()
    .withMessage("Store name cannot be empty for Store Owner"),
  check("dob")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .isISO8601()
    .withMessage("Valid date of birth is required"),
  check("gender")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),
  check("phone_number")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Valid phone number is required"),
  check("address")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .notEmpty()
    .withMessage("Address cannot be empty"),
  check("card_information.card_number")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .matches(/^\d{16}$/)
    .withMessage("Card number must be 16 digits"),
  check("card_information.cardholder_name")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .notEmpty()
    .withMessage("Cardholder name cannot be empty"),
  check("card_information.expiry_month")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .matches(/^(0[1-9]|1[0-2])$/)
    .withMessage("Valid expiry month (01-12) is required"),
  check("card_information.expiry_year")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .matches(/^\d{4}$/)
    .withMessage("Valid expiry year is required"),
  check("card_information.cvc")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .matches(/^\d{3,4}$/)
    .withMessage("Valid CVC (3-4 digits) is required"),
  check("expertise_level")
    .if((value, { req }) => req.body.role === 2)
    .optional()
    .isIn(["beginner", "intermediate", "expert"])
    .withMessage("Expertise level must be beginner, intermediate, or expert"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.full_name = req.body.full_name || user.full_name;
      user.store_name =
        req.body.role === 3 ? req.body.store_name || user.store_name : null;
      if (user.role === 2) {
        user.dob = req.body.dob ? new Date(req.body.dob) : user.dob;
        user.gender = req.body.gender || user.gender;
        user.phone_number = req.body.phone_number || user.phone_number;
        user.address = req.body.address || user.address;
        user.card_information =
          req.body.card_information || user.card_information;
        user.expertise_level = req.body.expertise_level || user.expertise_level;
        user.profile_image = req.body.profile_image || user.profile_image;
      }
      user.updated_at = Date.now();
      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: user.toObject({ getters: true }),
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

const forgotPassword = [
  check("email").isEmail().withMessage("Valid email is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordToken = otp;
      user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      await sendMail(
        email,
        "Password Reset OTP",
        `Your OTP for password reset is: ${otp}`
      );
      res.status(200).json({ message: "OTP sent to email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res
        .status(500)
        .json({
          message: "Server error",
          error: { code: error.code, message: error.message },
        });
    }
  },
];

const verifyOTP = [
  check("email").isEmail().withMessage("Valid email is required"),
  check("otp").notEmpty().withMessage("OTP is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, otp } = req.body;

    try {
      const user = await User.findOne({
        email,
        resetPasswordToken: otp,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user)
        return res.status(400).json({ message: "Invalid or expired OTP" });

      res.json({ message: "OTP verified successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

const resetPassword = [
  check("email").isEmail().withMessage("Valid email is required"),
  check("otp").notEmpty().withMessage("OTP is required"),
  check("new_password")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, otp, new_password } = req.body;

    try {
      const user = await User.findOne({
        email,
        resetPasswordToken: otp,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user)
        return res.status(400).json({ message: "Invalid or expired OTP" });

      user.password = await bcrypt.hash(new_password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

const subscribe = [
  check("plan").isIn(["free", "paid"]).withMessage("Plan must be free or paid"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { plan } = req.body;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (plan === user.subscription) {
        return res
          .status(400)
          .json({ message: `User is already on ${plan} plan` });
      }

      user.subscription = plan;
      if (plan === "paid") {
        user.subscription_start = new Date();
        user.subscription_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      } else {
        user.subscription_start = null;
        user.subscription_end = null;
      }
      await user.save();

      res.json({
        message: `Subscribed to ${plan} plan successfully`,
        subscription: user.subscription,
      });
    } catch (error) {
      console.error("Subscribe error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

const getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "subscription subscription_start subscription_end"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      subscription: user.subscription,
      subscription_start: user.subscription_start,
      subscription_end: user.subscription_end,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.subscription === "free") {
      return res.status(400).json({ message: "User is already on free plan" });
    }

    user.subscription = "free";
    user.subscription_start = null;
    user.subscription_end = null;
    await user.save();

    res.json({ message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
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
};
