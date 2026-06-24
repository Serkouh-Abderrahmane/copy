const pool = require('../database/db');

const Category = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM categories WHERE status = ? ORDER BY sort_order, name', ['active']);
    return rows;
  },

  async findAllWithProductCount() {
    const [rows] = await pool.query(
      'SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.status = ? WHERE c.status = ? GROUP BY c.id ORDER BY c.sort_order, c.name',
      ['active', 'active']
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0];
  },

  async findBySlug(slug) {
    const [rows] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
    return rows[0];
  },

  async create(data) {
    const [result] = await pool.query(
      'INSERT INTO categories (name, slug, description, image, parent_id, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.slug, data.description || null, data.image || null, data.parent_id || null, data.sort_order || 0, data.status || 'active']
    );
    return result.insertId;
  },

  async update(id, data) {
    const fields = []; const params = [];
    for (const [key, val] of Object.entries(data)) {
      if (['name','slug','description','image','parent_id','sort_order','status'].includes(key)) {
        fields.push(`${key} = ?`); params.push(val);
      }
    }
    if (fields.length === 0) return;
    params.push(id);
    await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);
  },

  async delete(id) {
    await pool.query('UPDATE products SET category_id = NULL WHERE category_id = ?', [id]);
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  }
};

module.exports = Category;
