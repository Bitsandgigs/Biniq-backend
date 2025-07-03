const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const feedbackSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  user_name: { type: String, required: true },
  user_email: { type: String, required: true },
  suggestion: { type: String, required: true },
  user_id: { type: String, ref: "User", required: true },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Feedback", feedbackSchema);
