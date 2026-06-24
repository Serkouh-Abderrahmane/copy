const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Category = require('../models/category');

router.get('/', async (req, res) => {
  try {
    const result = await Product.findAll(req.query);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/featured', async (req, res) => {
  try {
    const result = await Product.findAll({ featured: true, limit: 8 });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const products = await Product.search(req.query.q || '');
    res.json({ products });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findBySlug(req.params.slug);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const variants = await Product.getVariants(product.id);
    const related = await Product.getRelated(product.id, product.category_id);
    product.images = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
    res.json({ product, variants, related });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
