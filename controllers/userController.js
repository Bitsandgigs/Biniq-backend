const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

const register = [
  check('full_name').notEmpty().withMessage('Full name is required'),
  check('store_name').notEmpty().withMessage('Store name is required'),
  check('email').isEmail().withMessage('Valid email is required'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  check('confirm_password').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  check('role').notEmpty().withMessage('Role is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      return res.status(400).json({ success: false, error: errorMessages });
    }
    

    const { full_name, store_name, email, password, role } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ full_name, store_name, email, password: hashedPassword, role });
      await user.save();

      res.status(201).json({ success: true, user_id: user._id, message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error, success: false });
    }
  },
];

const login = [
  check('email').isEmail().withMessage('Valid email is required'),
  check('password').notEmpty().withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user_details: user });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
];

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

const updateProfile = [
  check('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  check('store_name').optional().notEmpty().withMessage('Store name cannot be empty'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.full_name = req.body.full_name || user.full_name;
      user.store_name = req.body.store_name || user.store_name;
      user.updated_at = Date.now();
      await user.save();

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
];

// const forgotPassword = [
//   check('email').isEmail().withMessage('Valid email is required'),
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

//     const { email } = req.body;

//     try {
//       const user = await User.findOne({ email });
//       if (!user) return res.status(404).json({ message: 'User not found' });

//       const otp = Math.floor(100000 + Math.random() * 900000).toString();
//       user.resetPasswordToken = otp;
//       user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
//       await user.save();

//       await sendOTP(email, otp);
//       res.json({ message: 'OTP sent to email' });
//     } catch (error) {
//       res.status(500).json({ message: 'Server error', error });
//     }
//   },
// ];
const forgotPassword = [
  check('email').isEmail().withMessage('Valid email is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordToken = otp;
      user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      await sendMail(email, 'Password Reset OTP', `Your OTP for password reset is: ${otp}`);
      res.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error', error: { code: error.code, message: error.message } });
    }
  },
];
const verifyOTP = [
  check('email').isEmail().withMessage('Valid email is required'),
  check('otp').notEmpty().withMessage('OTP is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, otp } = req.body;

    try {
      const user = await User.findOne({
        email,
        resetPasswordToken: otp,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

      res.json({ message: 'OTP verified successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
];

const resetPassword = [
  check('email').isEmail().withMessage('Valid email is required'),
  check('otp').notEmpty().withMessage('OTP is required'),
  check('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, otp, new_password } = req.body;

    try {
      const user = await User.findOne({
        email,
        resetPasswordToken: otp,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

      user.password = await bcrypt.hash(new_password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
];

module.exports = { register, login, getProfile, updateProfile, forgotPassword, verifyOTP, resetPassword };