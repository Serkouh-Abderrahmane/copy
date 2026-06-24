const pool = require('../database/db');

const Product = {
  async findAll({ category, search, sort, page = 1, limit = 20, featured } = {}) {
    page = parseInt(page);
    limit = parseInt(limit);
    let sql = 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ?';
    const params = ['active'];
    if (category) { sql += ' AND (c.slug = ? OR c.id = ?)'; params.push(category, category); }
    if (search) { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (featured) { sql += ' AND p.featured = 1'; }
    const sorts = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', name_asc: 'p.name ASC', name_desc: 'p.name DESC', newest: 'p.created_at DESC', oldest: 'p.created_at ASC' };
    sql += ' ORDER BY ' + (sorts[sort] || 'p.created_at DESC');
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await pool.query(sql, params);
    const [{ count }] = await pool.query('SELECT COUNT(*) as count FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ?', ['active']);
    return { products: rows, total: count, page, limit };
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const [rows] = await pool.query(
      'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?',
      [slug]
    );
    return rows[0] || null;
  },

  async getVariants(productId) {
    const [rows] = await pool.query('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order', [productId]);
    return rows;
  },

  async getRelated(productId, categoryId, limit = 4) {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE category_id = ? AND id != ? AND status = ? LIMIT ?',
      [categoryId, productId, 'active', limit]
    );
    return rows;
  },

  async create(data) {
    const [result] = await pool.query(
      'INSERT INTO products (name, slug, description, short_description, price, sale_price, sku, stock, category_id, images, status, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.slug, data.description, data.short_description, data.price, data.sale_price || null, data.sku, data.stock || 0, data.category_id || null, JSON.stringify(data.images || []), data.status || 'active', data.featured || false]
    );
    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    for (const [key, val] of Object.entries(data)) {
      if (['name','slug','description','short_description','price','sale_price','sku','stock','category_id','status','featured'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(val);
      }
    }
    if (data.images) { fields.push('images = ?'); params.push(JSON.stringify(data.images)); }
    if (fields.length === 0) return;
    params.push(id);
    await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
  },

  async delete(id) {
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
  },

  async search(query) {
    const [rows] = await pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ? AND (p.name LIKE ? OR p.sku LIKE ? OR c.name LIKE ?) LIMIT 10',
      ['active', `%${query}%`, `%${query}%`, `%${query}%`]
    );
    return rows;
  }
};

module.exports = Product;
