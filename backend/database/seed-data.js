const pool = require('./db');
const { createTables } = require('./schema');

const BANNERS = [
  { title: 'Bộ Sưu Tập Mới', subtitle: 'Khám phá phong cách của bạn', image: '/cdn/shop/files/Banner_Ngang_565c4.png', link: '/collections/all', sort_order: 1 },
  { title: 'Áo Thun Relaxed Fit', subtitle: 'Thoải mái, phong cách, cá tính', image: '/cdn/shop/files/Banner_Ngang_4_613c644d-34b9-4f3d-b7f9-7c56bb32c377fc86.png', link: '/collections/ao-thun', sort_order: 2 },
  { title: 'Áo Hoodie & Sweater', subtitle: 'Ấm áp và thời trang', image: '/cdn/shop/files/Banner_Ngang_3_98ba563d-67cf-41fc-8727-118e7a30d77934ed.png', link: '/collections/ao-hoodie', sort_order: 3 },
  { title: 'Phụ Kiện - Túi Canvas', subtitle: 'Hoàn thiện phong cách của bạn', image: '/cdn/shop/files/Banner_Ngang_32d65.png', link: '/collections/tui-canvas', sort_order: 4 },
];

const OPTION_TEMPLATES = {
  'Màu': { name: 'Màu', values: ['Đen', 'Trắng', 'Kem', 'Xám'] },
  'Cỡ': { name: 'Cỡ', values: ['S', 'M', 'L', 'XL'] },
};

const PRODUCT_VARIANTS = [
  { productId: 1,  options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 499000, stock: 20 },
  { productId: 1,  options: { 'Màu': 'Đen', 'Cỡ': 'L' }, price: 499000, stock: 15 },
  { productId: 1,  options: { 'Màu': 'Trắng', 'Cỡ': 'M' }, price: 499000, stock: 10 },
  { productId: 1,  options: { 'Màu': 'Trắng', 'Cỡ': 'L' }, price: 499000, stock: 12 },
  { productId: 18, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 249000, stock: 25 },
  { productId: 18, options: { 'Màu': 'Đen', 'Cỡ': 'L' }, price: 249000, stock: 20 },
  { productId: 18, options: { 'Màu': 'Trắng', 'Cỡ': 'M' }, price: 249000, stock: 18 },
  { productId: 18, options: { 'Màu': 'Trắng', 'Cỡ': 'L' }, price: 249000, stock: 15 },
  { productId: 19, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 249000, stock: 20 },
  { productId: 19, options: { 'Màu': 'Đen', 'Cỡ': 'L' }, price: 249000, stock: 15 },
  { productId: 19, options: { 'Màu': 'Trắng', 'Cỡ': 'M' }, price: 249000, stock: 10 },
  { productId: 20, options: { 'Màu': 'Kem', 'Cỡ': 'M' }, price: 249000, stock: 20 },
  { productId: 20, options: { 'Màu': 'Kem', 'Cỡ': 'L' }, price: 249000, stock: 15 },
  { productId: 21, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 249000, stock: 20 },
  { productId: 21, options: { 'Màu': 'Trắng', 'Cỡ': 'M' }, price: 249000, stock: 18 },
  { productId: 22, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 249000, stock: 20 },
  { productId: 22, options: { 'Màu': 'Đen', 'Cỡ': 'L' }, price: 249000, stock: 15 },
  { productId: 22, options: { 'Màu': 'Trắng', 'Cỡ': 'M' }, price: 249000, stock: 18 },
  { productId: 23, options: { 'Màu': 'Xám', 'Cỡ': 'M' }, price: 249000, stock: 15 },
  { productId: 23, options: { 'Màu': 'Xám', 'Cỡ': 'L' }, price: 249000, stock: 10 },
  { productId: 25, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 299000, stock: 20 },
  { productId: 25, options: { 'Màu': 'Đen', 'Cỡ': 'L' }, price: 299000, stock: 15 },
  { productId: 25, options: { 'Màu': 'Trắng', 'Cỡ': 'M' }, price: 299000, stock: 18 },
  { productId: 27, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 249000, stock: 20 },
  { productId: 27, options: { 'Màu': 'Trắng', 'Cỡ': 'M' }, price: 249000, stock: 15 },
  { productId: 28, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 399000, stock: 20 },
  { productId: 28, options: { 'Màu': 'Đen', 'Cỡ': 'L' }, price: 399000, stock: 15 },
  { productId: 29, options: { 'Màu': 'Kem', 'Cỡ': 'M' }, price: 229000, stock: 20 },
  { productId: 30, options: { 'Màu': 'Kem', 'Cỡ': 'M' }, price: 299000, stock: 15 },
  { productId: 31, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 229000, stock: 20 },
  { productId: 31, options: { 'Màu': 'Trắng', 'Cỡ': 'M' }, price: 229000, stock: 18 },
  { productId: 32, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 229000, stock: 25 },
  { productId: 33, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 229000, stock: 20 },
  { productId: 34, options: { 'Màu': 'Đen', 'Cỡ': 'M' }, price: 349000, stock: 15 },
  { productId: 35, options: { 'Màu': 'Kem', 'Cỡ': null }, price: 149000, stock: 30 },
];

const ACTIVE_PRODUCT_IDS = [1, 2, 5, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 27, 28];

async function seedData() {
  console.log('Starting data seed...');
  await createTables();

  // Step 1: Deactivate extra products
  const [allProducts] = await pool.query('SELECT id, name FROM products');
  for (const p of allProducts) {
    if (!ACTIVE_PRODUCT_IDS.includes(p.id)) {
      await pool.query('UPDATE products SET status = ? WHERE id = ?', ['inactive', p.id]);
      console.log(`Deactivated: ${p.name} (id: ${p.id})`);
    } else {
      await pool.query('UPDATE products SET status = ? WHERE id = ?', ['active', p.id]);
      console.log(`Activated: ${p.name} (id: ${p.id})`);
    }
  }

  // Step 2: Seed banners
  await pool.query('DELETE FROM banners');
  for (const b of BANNERS) {
    const [result] = await pool.query(
      'INSERT INTO banners (title, subtitle, image, link, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
      [b.title, b.subtitle, b.image, b.link, b.sort_order, 'active']
    );
    console.log(`Added banner: ${b.title} (id: ${result.insertId})`);
  }

  // Step 3: Seed variants
  await pool.query('DELETE FROM product_variants');
  let variantCount = 0;
  for (const v of PRODUCT_VARIANTS) {
    const productId = v.productId;
    const options = v.options;
    const optKeys = Object.keys(options);
    const opt1Name = optKeys[0] || null;
    const opt1Val = optKeys.length > 0 ? options[optKeys[0]] : null;
    const opt2Name = optKeys[1] || null;
    const opt2Val = optKeys.length > 1 ? options[optKeys[1]] : null;

    const [product] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (product.length === 0) {
      console.log(`Skipping variant - product ${productId} not found`);
      continue;
    }

    const name = optKeys.filter(k => options[k]).map(k => options[k]).join(' / ');
    const [result] = await pool.query(
      'INSERT INTO product_variants (product_id, name, sku, price, stock, option1_name, option1_value, option2_name, option2_value, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [productId, name, `VAR-${productId}-${variantCount + 1}`, v.price, v.stock, opt1Name, opt1Val, opt2Name, opt2Val, variantCount]
    );
    variantCount++;
    console.log(`Added variant: ${name} for product ${productId} (id: ${result.insertId})`);
  }

  console.log(`\nSeed complete!`);
  console.log(`- Banners: ${BANNERS.length}`);
  console.log(`- Active products: ${ACTIVE_PRODUCT_IDS.length}`);
  console.log(`- Variants: ${variantCount}`);
}

// Run directly if called as script
if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch(err => { console.error('Seed error:', err); process.exit(1); });
}

module.exports = seedData;
