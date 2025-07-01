const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const storeSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, ref: 'User', required: true, unique: true },
  store_name: { type: String, required: true },
  user_latitude: { type: Number, required: true },
  user_longitude: { type: Number, required: true },
  address: { type: String, required: true },
  city: { type: String, default: null },
  state: { type: String, default: null },
  zip_code: { type: String, default: null },
  country: { type: String, default: null },
  google_maps_link: { type: String, default: null },
  website_url: { type: String, default: null },
  working_days: { type: String, default: null }, // e.g., "Mon-Fri"
  working_time: { type: String, default: null }, // e.g., "9:00 AM - 5:00 PM"
  phone_number: { type: String, default: null },
  store_email: { type: String, default: null },
  facebook_link: { type: String,  default: null },
  instagram_link: { type: String, default: null },
  twitter_link: { type: String, default: null },
  whatsapp_link: { type: String, default: null },
  followers: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  store_image: { type: String, default: null }, // S3 URL
  ratings: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// storeSchema.index({ user_id: 1 }, { unique: true });
// storeSchema.index({ store_name: 1, city: 1 });

module.exports = mongoose.model('Store', storeSchema);