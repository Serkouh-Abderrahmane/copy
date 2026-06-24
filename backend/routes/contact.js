const express = require('express');
const router = express.Router();
const pool = require('../database/db');

router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, body } = req.body;
    if (email) {
      await pool.query(
        'INSERT INTO contact_submissions (name, email, phone, message, created_at) VALUES (?, ?, ?, ?, NOW())',
        [name || '', email, phone || '', body || '']
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});

router.post('/subscribe', async (req, res) => {
  try {
    const email = req.body.email || req.body.contact?.email;
    if (email) {
      const [existing] = await pool.query('SELECT id FROM newsletter_subscribers WHERE email = ?', [email]);
      if (existing.length === 0) {
        await pool.query('INSERT INTO newsletter_subscribers (email, created_at) VALUES (?, NOW())', [email]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});

module.exports = router;
