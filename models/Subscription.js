const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const subscriptionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  order_id: { type: String, default: uuidv4, unique: true },
  user_id: { type: String, ref: "User", required: true },
  user_name: { type: String, required: true },
  type: { type: String, enum: ["reseller", "store_owner"], required: true },
  plan: { type: String, enum: ["tier1", "tier2", "tier3"], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["completed", "failed"], required: true },
  date: { type: Date, default: Date.now },
  duration: { type: Number, required: true }, // Duration in days
});

subscriptionSchema.index({ order_id: 1 }, { unique: true });

module.exports = mongoose.model("Subscription", subscriptionSchema);
