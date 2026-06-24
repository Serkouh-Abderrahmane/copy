const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const Order = require('../models/order');
const { v4: uuidv4 } = require('uuid');

const getCart = async (customerId, sessionId) => {
  if (customerId) {
    let [carts] = await pool.query('SELECT * FROM carts WHERE customer_id = ?', [customerId]);
    if (carts.length > 0) return carts[0].id;
    if (sessionId) {
      let [sessionCarts] = await pool.query('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
      if (sessionCarts.length > 0) {
        await pool.query('UPDATE carts SET customer_id = ? WHERE id = ?', [customerId, sessionCarts[0].id]);
        return sessionCarts[0].id;
      }
    }
    const [r] = await pool.query('INSERT INTO carts (customer_id) VALUES (?)', [customerId]);
    return r.insertId;
  }
  if (sessionId) {
    let [carts] = await pool.query('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
    if (carts.length > 0) return carts[0].id;
    const [r] = await pool.query('INSERT INTO carts (session_id) VALUES (?)', [sessionId]);
    return r.insertId;
  }
  return null;
};

async function getCartData(cartId) {
  const [items] = await pool.query(
    `SELECT ci.*, p.name as product_name, p.price, p.sale_price, p.images, p.slug 
     FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?`,
    [cartId]
  );
  const subtotal = items.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0);
  return { items, subtotal };
}

router.get('/', async (req, res) => {
  try {
    const sessionId = req.cookies?.cart_session;
    if (!sessionId) return res.redirect('/cart');
    const cartId = await getCart(req.customer?.id, sessionId);
    if (!cartId) return res.redirect('/cart');
    const { items, subtotal } = await getCartData(cartId);
    if (items.length === 0) return res.redirect('/cart');
    const shipping = 0;
    const total = subtotal + shipping;
    res.render('checkout', {
      items,
      subtotal,
      shipping,
      total,
      customer: req.customer || null
    });
  } catch (err) {
    res.redirect('/cart');
  }
});

router.post('/', async (req, res) => {
  try {
    const sessionId = req.cookies?.cart_session;
    if (!sessionId) return res.redirect('/cart');
    const cartId = await getCart(req.customer?.id, sessionId);
    if (!cartId) return res.redirect('/cart');
    const { items, subtotal } = await getCartData(cartId);
    if (items.length === 0) return res.redirect('/cart');
    const { shipping_name, shipping_phone, shipping_address, note } = req.body;
    const customerId = req.customer?.id;
    if (!customerId) {
      req.session.checkoutData = req.body;
      return res.redirect('/account/login?redirect=/checkout');
    }
    const orderNumber = await Order.getOrderNumber();
    const orderItems = items.map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      product_name: item.product_name,
      variant_name: null,
      quantity: item.quantity,
      price: item.sale_price || item.price,
      total: (item.sale_price || item.price) * item.quantity,
      image: item.images ? (typeof item.images === 'string' ? JSON.parse(item.images) : item.images)[0] || null : null
    }));
    const orderId = await Order.create({
      customer_id: customerId,
      order_number: orderNumber,
      subtotal,
      shipping_fee: 0,
      discount: 0,
      total: subtotal,
      payment_method: 'cod',
      shipping_name: shipping_name || '',
      shipping_phone: shipping_phone || '',
      shipping_address: shipping_address || '',
      note: note || '',
      items: orderItems
    });
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    res.redirect(`/order/confirm/${orderId}`);
  } catch (err) {
    res.status(500).send('Lỗi khi tạo đơn hàng: ' + err.message);
  }
});

module.exports = router;
