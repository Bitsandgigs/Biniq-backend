const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const cardInformationSchema = new mongoose.Schema({
  card_number: { type: String, default: null },
  cardholder_name: { type: String, default: null },
  expiry_month: { type: String, default: null },
  expiry_year: { type: String, default: null },
  cvc: { type: String, default: null },
});

const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  full_name: { type: String, required: true },
  store_name: { type: String, default: null }, // Optional for non-store owners
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: Number, enum: [1, 2, 3], required: true }, // 1 = Admin, 2 = Reseller, 3 = Store Owner
  dob: { type: Date, default: null }, // Reseller-specific
  gender: { type: String, enum: ["male", "female", "other"], default: null }, // Reseller-specific
  phone_number: { type: String, default: null }, // Reseller-specific
  address: { type: String, default: null }, // Reseller-specific
  card_information: { type: cardInformationSchema, default: () => ({}) }, // Reseller-specific
  expertise_level: {
    type: String,
    enum: ["beginner", "intermediate", "expert"],
    default: null,
  }, // Reseller-specific
  profile_image: { type: String, default: null }, // Reseller-specific
  subscription: { type: String, enum: ["free", "paid"], default: "free" }, // Subscription status
  subscription_start: { type: Date, default: null }, // Subscription start date
  subscription_end: { type: Date, default: null }, // Subscription end date
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
