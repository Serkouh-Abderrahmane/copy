const bcrypt = require('bcryptjs');
const pool = require('./db');
const { createTables } = require('./schema');

async function seed() {
  try {
    console.log('Creating tables...');
    await createTables();

    console.log('Seeding admin user...');
    const hash = await bcrypt.hash('admin123', 10);
    const [existing] = await pool.query('SELECT id FROM admin_users WHERE username = ?', ['admin']);
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'admin@luonvuituoi.co', hash, 'Admin', 'admin']
      );
      console.log('  Admin created: admin / admin123');
    } else {
      console.log('  Admin already exists');
    }

    console.log('\nSeeding site settings...');
    const settings = [
      ['site_name', 'Luon Vuituoi'],
      ['site_description', 'Be Fun. Be You. Be Vui Tươi'],
      ['currency', 'VND'],
      ['currency_symbol', '₫'],
      ['shipping_fee', '30000'],
      ['free_shipping_min', '500000'],
      ['contact_email', 'hello@luonvuituoi.co'],
      ['contact_phone', ''],
      ['address', ''],
    ];
    for (const [key, val] of settings) {
      await pool.query(
        'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, val, val]
      );
    }
    console.log('  Settings seeded');

    console.log('\nSeed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
