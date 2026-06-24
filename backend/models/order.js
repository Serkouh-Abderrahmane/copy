const pool = require('../database/db');

const Order = {
  async create(data) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO orders (customer_id, order_number, status, subtotal, shipping_fee, discount, total, payment_status, payment_method, shipping_name, shipping_phone, shipping_address, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.customer_id || null, data.order_number, 'pending', data.subtotal, data.shipping_fee || 0, data.discount || 0, data.total, 'pending', data.payment_method || 'cod', data.shipping_name, data.shipping_phone, data.shipping_address, data.note || null]
      );
      const orderId = result.insertId;
      for (const item of data.items) {
        await conn.query(
          'INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, price, total, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.variant_id || null, item.product_name, item.variant_name || null, item.quantity, item.price, item.total, item.image || null]
        );
      }
      await conn.commit();
      return orderId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async findById(id) {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orders[0]) return null;
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    orders[0].items = items;
    return orders[0];
  },

  async findByCustomer(customerId) {
    const [orders] = await pool.query('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }
    return orders;
  },

  async findAll({ page = 1, limit = 20, status } = {}) {
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(String(limit), String((page - 1) * limit));
    const [rows] = await pool.query(sql, params);
    const [{ count }] = await pool.query('SELECT COUNT(*) as count FROM orders');
    return { orders: rows, total: count, page, limit };
  },

  async updateStatus(id, status) {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  },

  async getOrderNumber() {
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const num = String(rows[0].count + 1).padStart(4, '0');
    return `ORD-${today}-${num}`;
  }
};

module.exports = Order;
