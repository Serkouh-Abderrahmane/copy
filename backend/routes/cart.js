const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { authenticateCustomer, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const getCart = async (customerId, sessionId) => {
  if (customerId) {
    let [carts] = await pool.query('SELECT * FROM carts WHERE customer_id = ?', [customerId]);
    if (carts.length === 0) {
      const [result] = await pool.query('INSERT INTO carts (customer_id) VALUES (?)', [customerId]);
      return result.insertId;
    }
    return carts[0].id;
  }
  if (sessionId) {
    let [carts] = await pool.query('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
    if (carts.length === 0) {
      const [result] = await pool.query('INSERT INTO carts (session_id) VALUES (?)', [sessionId]);
      return result.insertId;
    }
    return carts[0].id;
  }
  return null;
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    const sessionId = req.cookies?.cart_session || uuidv4();
    if (!req.cookies?.cart_session) res.cookie('cart_session', sessionId, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    const cartId = await getCart(req.customer?.id, sessionId);
    if (!cartId) return res.json({ items: [], total: 0 });
    const [items] = await pool.query(
      'SELECT ci.*, p.name as product_name, p.price, p.sale_price, p.images, p.slug FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?',
      [cartId]
    );
    const total = items.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0);
    res.json({ items, total, cart_id: cartId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/add', optionalAuth, async (req, res) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;
    const sessionId = req.cookies?.cart_session || uuidv4();
    if (!req.cookies?.cart_session) res.cookie('cart_session', sessionId, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    const cartId = await getCart(req.customer?.id, sessionId);
    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [cartId, product_id, variant_id || null, variant_id || null]
    );
    if (existing.length > 0) {
      await pool.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing[0].id]);
    } else {
      await pool.query('INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)',
        [cartId, product_id, variant_id || null, quantity]);
    }
    res.json({ message: 'Added to cart' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/update', optionalAuth, async (req, res) => {
  try {
    const { item_id, quantity } = req.body;
    if (quantity <= 0) {
      await pool.query('DELETE FROM cart_items WHERE id = ?', [item_id]);
    } else {
      await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, item_id]);
    }
    res.json({ message: 'Cart updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/remove/:itemId', optionalAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = ?', [req.params.itemId]);
    res.json({ message: 'Item removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/clear', optionalAuth, async (req, res) => {
  try {
    const sessionId = req.cookies?.cart_session;
    const cartId = await getCart(req.customer?.id, sessionId);
    if (cartId) await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    res.json({ message: 'Cart cleared' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
