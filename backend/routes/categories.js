const express = require('express');
const router = express.Router();
const Category = require('../models/category');

router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAllWithProductCount();
    res.json({ categories });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:slug', async (req, res) => {
  try {
    const category = await Category.findBySlug(req.params.slug);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
