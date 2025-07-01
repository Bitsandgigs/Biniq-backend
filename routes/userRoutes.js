const express = require('express');
const { register, login, getProfile, updateProfile, forgotPassword, verifyOTP, resetPassword } = require('../controllers/userController');
const { authenticate } = require('../utils/auth');

const router = express.Router();

router.post('/register', ...register);
router.post('/login', ...login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, ...updateProfile);
router.post('/forgot-password', ...forgotPassword);
router.post('/verify-otp', ...verifyOTP);
router.post('/reset-password', ...resetPassword);

module.exports = router;