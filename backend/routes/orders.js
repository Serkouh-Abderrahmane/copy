const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const pool = require('../database/db');
const { authenticateCustomer } = require('../middleware/auth');

router.post('/', authenticateCustomer, async (req, res) => {
  try {
    const { shipping_name, shipping_phone, shipping_address, payment_method, items, note } = req.body;
    const orderNumber = await Order.getOrderNumber();
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const [product] = await pool.query('SELECT id, name, price, sale_price, images FROM products WHERE id = ?', [item.product_id]);
      if (product.length === 0) continue;
      const price = product[0].sale_price || product[0].price;
      const total = price * item.quantity;
      subtotal += total;
      const imgs = typeof product[0].images === 'string' ? JSON.parse(product[0].images) : (product[0].images || []);
      orderItems.push({
        product_id: product[0].id,
        variant_id: item.variant_id || null,
        product_name: product[0].name,
        variant_name: item.variant_name || null,
        quantity: item.quantity,
        price,
        total,
        image: imgs[0] || null
      });
    }
    const orderId = await Order.create({
      customer_id: req.customer.id,
      order_number: orderNumber,
      subtotal,
      shipping_fee: 0,
      discount: 0,
      total: subtotal,
      payment_method,
      shipping_name, shipping_phone, shipping_address, note,
      items: orderItems
    });
    const sessionId = req.cookies?.cart_session;
    if (sessionId) {
      const [cart] = await pool.query('SELECT id FROM carts WHERE customer_id = ?', [req.customer.id]);
      if (cart.length > 0) await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cart[0].id]);
    }
    res.json({ order_id: orderId, order_number: orderNumber });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/my-orders', authenticateCustomer, async (req, res) => {
  try {
    const orders = await Order.findByCustomer(req.customer.id);
    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', authenticateCustomer, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customer_id !== req.customer.id) return res.status(403).json({ message: 'Not authorized' });
    res.json({ order });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
