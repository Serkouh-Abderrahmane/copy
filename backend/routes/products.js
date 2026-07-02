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

function fixBannerPath(img) {
  return img
    .replace(/\/Banner_Ngang_(\d+)_([a-f0-9-]+)\.(png|jpg|webp)/g, '/Banner_Ngang_$1.$3')
    .replace(/\/Banner_Ngang_(\d+)[a-f0-9]+\.(png|jpg|webp)/g, '/Banner_Ngang_$1.$2');
}

router.get('/homepage', async (req, res) => {
  try {
    const pool = require('../database/db');
    const [banners] = await pool.query('SELECT * FROM banners WHERE status = ? ORDER BY sort_order', ['active']);
    const fixedBanners = banners.map(b => ({ ...b, image: fixBannerPath(b.image) }));
    const featured = await Product.findAll({ featured: true, limit: 8 });
    const newArrivals = await Product.findAll({ limit: 8, sort: 'newest' });
    const categories = await Category.findAllWithProductCount();
    res.json({ banners: fixedBanners, featured: featured.products, newArrivals: newArrivals.products, categories });
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
