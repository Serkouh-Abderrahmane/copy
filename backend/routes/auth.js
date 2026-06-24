const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const { authenticateCustomer } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone } = req.body;
    const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO customers (first_name, last_name, email, password_hash, phone) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, email, password_hash, phone || null]
    );
    const token = jwt.sign({ id: result.insertId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ token, customer: { id: result.insertId, email, first_name, last_name } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM customers WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ token, customer: { id: rows[0].id, email: rows[0].email, first_name: rows[0].first_name, last_name: rows[0].last_name } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticateCustomer, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ?', [req.customer.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/recover', async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
      if (existing.length > 0) {
        console.log('Password recovery requested for:', email);
      }
    }
    res.json({ success: true, message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu' });
  } catch (err) {
    res.json({ success: true, message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu' });
  }
});

module.exports = router;
