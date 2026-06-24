const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const Product = require('../models/product');
const Category = require('../models/category');
const Order = require('../models/order');
const { authenticateAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const slugify = require('slugify');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM admin_users WHERE username = ? OR email = ?', [username, username]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    if (rows[0].status !== 'active') return res.status(403).json({ message: 'Account disabled' });
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username, role: rows[0].role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('admin_token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ token, admin: { id: rows[0].id, username: rows[0].username, role: rows[0].role, full_name: rows[0].full_name } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.use(authenticateAdmin);

router.get('/me', (req, res) => res.json(req.admin));

router.get('/dashboard', async (req, res) => {
  try {
    const [[{ total_products }]] = await pool.query('SELECT COUNT(*) as total_products FROM products');
    const [[{ total_orders }]] = await pool.query('SELECT COUNT(*) as total_orders FROM orders');
    const [[{ total_customers }]] = await pool.query('SELECT COUNT(*) as total_customers FROM customers');
    const [[{ total_revenue }]] = await pool.query('SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE status != ?', ['cancelled']);
    const [recentOrders] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5');
    const [recentProducts] = await pool.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 5');
    res.json({ total_products, total_orders, total_customers, total_revenue, recentOrders, recentProducts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/products', async (req, res) => {
  try {
    const result = await Product.findAll({ ...req.query, limit: 50 });
    const categories = await Category.findAll();
    res.json({ ...result, categories });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/products', upload.array('images', 10), async (req, res) => {
  try {
    const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
    const slug = slugify(req.body.name, { lower: true, strict: true });
    const id = await Product.create({
      ...req.body,
      slug,
      images,
      price: parseInt(req.body.price),
      sale_price: req.body.sale_price ? parseInt(req.body.sale_price) : null
    });
    res.json({ id, message: 'Product created' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/products/:id', upload.array('images', 10), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.files && req.files.length > 0) {
      data.images = req.files.map(f => '/uploads/' + f.filename);
    }
    if (data.price) data.price = parseInt(data.price);
    if (data.sale_price) data.sale_price = parseInt(data.sale_price);
    await Product.update(parseInt(req.params.id), data);
    res.json({ message: 'Product updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await Product.delete(parseInt(req.params.id));
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAllWithProductCount();
    res.json({ categories });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/categories', async (req, res) => {
  try {
    const slug = slugify(req.body.name, { lower: true, strict: true });
    const id = await Category.create({ ...req.body, slug });
    res.json({ id, message: 'Category created' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/categories/:id', async (req, res) => {
  try {
    await Category.update(parseInt(req.params.id), req.body);
    res.json({ message: 'Category updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await Category.delete(parseInt(req.params.id));
    res.json({ message: 'Category deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/orders', async (req, res) => {
  try {
    const result = await Order.findAll(req.query);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(parseInt(req.params.id));
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    await Order.updateStatus(parseInt(req.params.id), req.body.status);
    res.json({ message: 'Order status updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/customers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, first_name, last_name, email, phone, status, created_at FROM customers ORDER BY created_at DESC');
    res.json({ customers: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
