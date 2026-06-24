const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Product = require('../models/product');
const Category = require('../models/category');
const pool = require('../database/db');

const readOriginalHTML = (filePath) => {
  const fullPath = path.join(__dirname, '..', '..', filePath);
  if (fs.existsSync(fullPath)) {
    let html = fs.readFileSync(fullPath, 'utf8');
    if (!filePath.startsWith('admin') && !filePath.includes('admin/')) {
      html = html.replace('</body>', '<script src="/js/bridge.js"></script></body>');
    }
    return html;
  }
  return null;
};

router.get('/', async (req, res) => {
  try {
    const result = await Product.findAll({ featured: true, limit: 8 });
    const categories = await Category.findAllWithProductCount();
    const html = readOriginalHTML('index.html');
    res.send(html);
  } catch (err) {
    const html = readOriginalHTML('index.html');
    if (html) return res.send(html);
    res.status(500).send('Error');
  }
});

router.get('/cart', (req, res) => {
  const html = readOriginalHTML('cart.html');
  if (html) return res.send(html);
  res.status(404).send('Cart page not found');
});

router.get('/collections/:slug', async (req, res) => {
  const possibleFiles = [
    `collections/${req.params.slug}.html`,
    `collections/${req.params.slug}4658.html`,
    `collections/${req.params.slug}9ba9.html`
  ];
  for (const f of possibleFiles) {
    const html = readOriginalHTML(f);
    if (html) return res.send(html);
  }
  const html = readOriginalHTML('collections/all.html');
  if (html) return res.send(html);
  res.status(404).send('Collection not found');
});

router.get('/products/:slug', async (req, res) => {
  const possibleFiles = [
    `products/${req.params.slug}.html`,
    `products/${req.params.slug}.html.z`
  ];
  for (const f of possibleFiles) {
    if (f.endsWith('.html')) {
      const html = readOriginalHTML(f);
      if (html) return res.send(html);
    }
  }
  res.status(404).send('Product not found');
});

router.get('/pages/:slug', (req, res) => {
  const pageMap = {
    'lien-he': 'pages/contact.html',
    'gioi-thieu': 'pages/gioi-thieu.html',
    'chinh-sach-bao-mat': 'pages/chinh-sach-bao-mat-thong-tin.html',
    'chinh-sach-doi-tra': 'pages/chinh-sach-doi-tra.html',
    'chinh-sach-giao-nhan': 'pages/chinh-sach-giao-nhan-hang-va-kiem-hang.html',
    'chinh-sach-thanh-toan': 'pages/chinh-sach-thanh-toan.html',
    'dieu-khoan-dich-vu': 'pages/dieu-khoan-dich-vu.html'
  };
  const file = pageMap[req.params.slug] || `pages/${req.params.slug}.html`;
  const html = readOriginalHTML(file);
  if (html) return res.send(html);
  res.status(404).send('Page not found');
});

router.get('/account/login', (req, res) => {
  const html = readOriginalHTML('account/login.html');
  if (html) return res.send(html);
  res.status(404).send('Login page not found');
});

router.get('/account/register', (req, res) => {
  const html = readOriginalHTML('account/register.html');
  if (html) return res.send(html);
  res.status(404).send('Register page not found');
});

router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'views', 'admin', 'index.html'));
});

router.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'views', 'admin', 'index.html'));
});

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.redirect('/');
  try {
    const products = await Product.search(q);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
