const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const Product = require('../models/product');
const Category = require('../models/category');

router.get('/homepage', async (req, res) => {
  try {
    const [slides] = await pool.query(
      'SELECT * FROM banners WHERE status = ? ORDER BY sort_order ASC',
      ['active']
    );

    const categories = await Category.findAllWithProductCount();

    const featuredResult = await Product.findAll({ featured: true, limit: 8 });
    const featuredProducts = (featuredResult.products || []).map(p => ({
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
    }));

    const newResult = await Product.findAll({ sort: 'newest', limit: 8 });
    const newArrivals = (newResult.products || []).map(p => ({
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
    }));

    const [[{ product_count }]] = await pool.query(
      'SELECT COUNT(*) as product_count FROM products WHERE status = ?',
      ['active']
    );

    res.json({
      slideshow: { slides },
      collection_list: { collections: categories },
      featured_products: { products: featuredProducts },
      new_arrivals: { products: newArrivals },
      stats: { product_count }
    });
  } catch (err) {
    console.error('Homepage API error:', err);
    res.status(500).json({
      slideshow: { slides: [] },
      collection_list: { collections: [] },
      featured_products: { products: [] },
      new_arrivals: { products: [] }
    });
  }
});

module.exports = router;
