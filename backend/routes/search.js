const express = require('express');
const router = express.Router();
const Product = require('../models/product');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ products: [] });
    const products = await Product.search(q);
    res.json({ products });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
