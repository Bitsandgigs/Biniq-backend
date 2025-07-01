const { check, validationResult } = require('express-validator');
const Promotion = require('../models/Promotion');
const ProductCategory = require('../models/ProductCategory');

const createPromotion = [
  check('category_id').notEmpty().withMessage('Category ID is required'),
  check('title').notEmpty().withMessage('Title is required'),
  check('description').notEmpty().withMessage('Description is required'),
  check('upc_id').notEmpty().withMessage('UPC ID is required'),
  check('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  check('status').isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
  check('visibility').isIn(['On', 'Off']).withMessage('Visibility must be On or Off'),
  check('start_date').notEmpty().withMessage('Start date is required'),
  check('end_date').notEmpty().withMessage('End date is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { category_id, title, description, upc_id, tags, price, status, start_date, end_date, visibility } = req.body;

    try {
      const category = await ProductCategory.findById(category_id);
      if (!category) return res.status(404).json({ message: 'Category not found' });

      const promotion = new Promotion({
        user_id: req.user.userId,
        category_id,
        title,
        description,
        upc_id,
        tags,
        price,
        status,
        start_date,
        end_date,
        visibility,
      });

      await promotion.save();
      res.status(201).json({ promotion_id: promotion._id, message: 'Promotion created successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
];

const getPromotions = async (req, res) => {
  const { status, visibility } = req.query;

  try {
    const query = { user_id: req.user.userId };
    if (status) query.status = status;
    if (visibility) query.visibility = visibility;

    const promotions = await Promotion.find(query)
      .populate('category_id', 'category_name')
      .sort({ start_date: -1 });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

const updatePromotion = [
  check('category_id').optional().notEmpty().withMessage('Category ID cannot be empty'),
  check('title').optional().notEmpty().withMessage('Title cannot be empty'),
  check('description').optional().notEmpty().withMessage('Description cannot be empty'),
  check('upc_id').optional().notEmpty().withMessage('UPC ID cannot be empty'),
  check('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  check('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
  check('visibility').optional().isIn(['On', 'Off']).withMessage('Visibility must be On or Off'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { promotion_id } = req.params;
    const updates = req.body;

    try {
      const promotion = await Promotion.findOne({ _id: promotion_id, user_id: req.user.userId });
      if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

      if (updates.category_id) {
        const category = await ProductCategory.findById(updates.category_id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
      }

      Object.assign(promotion, updates, { updated_at: Date.now() });
      await promotion.save();
      res.json({ message: 'Promotion updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
];

const deletePromotion = async (req, res) => {
  const { promotion_id } = req.params;

  try {
    const promotion = await Promotion.findOneAndDelete({ _id: promotion_id, user_id: req.user.userId });
    if (!promotion) return res.status(404).json({ message: 'Promotion not found' });
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

module.exports = { createPromotion, getPromotions, updatePromotion, deletePromotion };