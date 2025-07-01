const express = require('express');
const { createStore, getStore, updateStore } = require('../controllers/storeController');
const { authenticate } = require('../utils/auth');

const router = express.Router();

router.post('/', authenticate, createStore);
router.get('/', authenticate, getStore);
router.put('/', authenticate, updateStore);

module.exports = router;