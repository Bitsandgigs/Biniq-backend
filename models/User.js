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
  store_name: { type: String, default: null },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: Number, enum: [1, 2, 3], required: true }, // 1 = Admin, 2 = Reseller, 3 = Store Owner
  dob: { type: Date, default: null },
  gender: { type: String, enum: ["male", "female", "other"], default: null },
  phone_number: { type: String, default: null },
  address: { type: String, default: null },
  card_information: { type: cardInformationSchema, default: () => ({}) },
  expertise_level: {
    type: String,
    enum: ["beginner", "intermediate", "expert"],
    default: null,
  },
  profile_image: { type: String, default: null },
  subscription: { type: String, ref: "Subscription", default: null }, // Reference to active Subscription
  total_promotions: { type: Number, default: 0 }, // Store owner
  promotions: [{ type: String }], // Store owner: Array of promotion IDs
  verified: { type: Boolean, default: false }, // Store owner
  total_scans: { type: Number, default: 0 }, // Reseller
  scans_used: [{ type: String }], // Reseller: Array of scan IDs
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
