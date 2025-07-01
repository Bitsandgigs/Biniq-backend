const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  full_name: { type: String, required: true },
  store_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: Number, enum: [1, 2, 3], required: true }, // 1 = Admin, 2 = Reseller, 3 = Store Owner
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  resetPasswordToken: { type: String }, // For forgot password
  resetPasswordExpires: { type: Date }, // OTP expiration
});

// userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);