const pool = require('./db');

const createTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      image VARCHAR(500),
      parent_id INT DEFAULT NULL,
      sort_order INT DEFAULT 0,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      short_description TEXT,
      price DECIMAL(12,0) NOT NULL DEFAULT 0,
      sale_price DECIMAL(12,0) DEFAULT NULL,
      sku VARCHAR(100),
      stock INT DEFAULT 0,
      category_id INT DEFAULT NULL,
      images JSON,
      status ENUM('active', 'inactive', 'draft') DEFAULT 'active',
      featured BOOLEAN DEFAULT FALSE,
      weight DECIMAL(10,2) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS product_variants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100),
      price DECIMAL(12,0) DEFAULT NULL,
      stock INT DEFAULT 0,
      option1_name VARCHAR(100),
      option1_value VARCHAR(100),
      option2_name VARCHAR(100),
      option2_value VARCHAR(100),
      image VARCHAR(500),
      sort_order INT DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS shopify_variants (
      id bigint(20) NOT NULL PRIMARY KEY,
      product_id int(11) NOT NULL,
      KEY product_id (product_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      label VARCHAR(100) DEFAULT 'Home',
      full_name VARCHAR(255),
      phone VARCHAR(20),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      zip VARCHAR(20),
      country VARCHAR(100) DEFAULT 'Vietnam',
      is_default BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT DEFAULT NULL,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
      subtotal DECIMAL(12,0) NOT NULL DEFAULT 0,
      shipping_fee DECIMAL(12,0) DEFAULT 0,
      discount DECIMAL(12,0) DEFAULT 0,
      total DECIMAL(12,0) NOT NULL DEFAULT 0,
      payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
      payment_method VARCHAR(100),
      shipping_name VARCHAR(255),
      shipping_phone VARCHAR(20),
      shipping_address TEXT,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT DEFAULT NULL,
      variant_id INT DEFAULT NULL,
      product_name VARCHAR(255),
      variant_name VARCHAR(255),
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(12,0) NOT NULL,
      total DECIMAL(12,0) NOT NULL,
      image VARCHAR(500),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS carts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT DEFAULT NULL,
      session_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cart_id INT NOT NULL,
      product_id INT NOT NULL,
      variant_id INT DEFAULT NULL,
      quantity INT NOT NULL DEFAULT 1,
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS wishlists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY unique_wishlist (customer_id, product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      customer_id INT DEFAULT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(255),
      comment TEXT,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
      value DECIMAL(12,0) NOT NULL,
      min_order DECIMAL(12,0) DEFAULT 0,
      usage_limit INT DEFAULT NULL,
      used_count INT DEFAULT 0,
      starts_at DATETIME,
      expires_at DATETIME,
      status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255),
      subtitle VARCHAR(255),
      image VARCHAR(500) NOT NULL,
      link VARCHAR(500),
      sort_order INT DEFAULT 0,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS site_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS contact_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(20),
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(100) PRIMARY KEY,
      data JSON,
      expires_at DATETIME
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  for (const sql of tables) {
    try {
      await pool.query(sql);
      console.log('Table created successfully');
    } catch (err) {
      console.error('Error creating table:', err.message);
    }
  }
};

const runSchema = async () => {
  try {
    await createTables();
    console.log('All tables created');
    process.exit(0);
  } catch (err) {
    console.error('Schema creation failed:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  runSchema();
}

module.exports = { createTables };
