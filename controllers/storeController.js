const { check, validationResult } = require('express-validator');
const Store = require('../models/Store');
const User = require('../models/User');

const createStore = [
  check('user_latitude').notEmpty().withMessage('User latititude is required'),
  check('user_longitude').notEmpty().withMessage('User longitude is required'),
  check('address').notEmpty().withMessage('Address is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      store_name, user_latitude, user_longitude,address, city, state, zip_code, country, google_maps_link,
      website_url, working_days, working_time, phone_number, store_email,
      facebook_link, instagram_link, twitter_link, whatsapp_link, store_image,
    } = req.body;

    try {
      let store = await Store.findOne({ user_id: req.user.userId });
      let user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (store) return res.status(400).json({ message: 'Store already exists for this user' });

      store = new Store({
        user_id: req.user.userId,
        store_name: user.store_name,
        user_latitude,
        user_longitude,
        address,
        city,
        state,
        zip_code,
        country,
        google_maps_link,
        website_url,
        working_days,
        working_time,
        phone_number,
        store_email,
        facebook_link,
        instagram_link,
        twitter_link,
        whatsapp_link,
        store_image,
      });

      await store.save();
      res.status(201).json({ store_id: store._id, message: 'Store created successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
];

const getStore = async (req, res) => {
  try {
    const store = await Store.findOne({ user_id: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

const updateStore = [
  check('store_name').optional().notEmpty().withMessage('Store name cannot be empty'),
  check('address').optional().notEmpty().withMessage('Address cannot be empty'),
  check('city').optional().notEmpty().withMessage('City cannot be empty'),
  check('state').optional().notEmpty().withMessage('State cannot be empty'),
  check('zip_code').optional().notEmpty().withMessage('Zip code cannot be empty'),
  check('country').optional().notEmpty().withMessage('Country cannot be empty'),
  check('working_days').optional().notEmpty().withMessage('Working days cannot be empty'),
  check('working_time').optional().notEmpty().withMessage('Working time cannot be empty'),
  check('phone_number').optional().notEmpty().withMessage('Phone number cannot be empty'),
  check('store_email').optional().isEmail().withMessage('Valid store email is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const updates = req.body;

    try {
      const store = await Store.findOne({ user_id: req.user.userId });
      if (!store) return res.status(404).json({ message: 'Store not found' });

      Object.assign(store, updates, { updated_at: Date.now() });
      await store.save();
      res.json({ message: 'Store updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
];

module.exports = { createStore, getStore, updateStore };