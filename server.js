const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { optionalAuth } = require('./backend/middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.JWT_SECRET || 'luon-vui-tuoi-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Generate placeholder for missing images
const placeholderImg = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');

// Serve static CSS/JS assets from local cdn/ directory (HTTrack-downloaded assets)
app.use('/cdn', express.static(path.join(__dirname, 'cdn')), (req, res, next) => {
  // Proxy static assets to original Shopify server (for /cdn/shop/files/ paths not on Railway disk)
  // Only reached if the file wasn't found in local cdn/ directory
  const https = require('https');
  const options = {
    hostname: '23.227.38.74',
    port: 443,
    path: req.originalUrl,
    method: req.method,
    headers: { 'Host': 'luonvuituoi.co' },
    servername: 'luonvuituoi.co',
    rejectUnauthorized: false,
    timeout: 15000
  };
  let destroyed = false;
  const proxyReq = https.request(options, (proxyRes) => {
    if (proxyRes.statusCode >= 400) {
      proxyRes.resume();
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(placeholderImg);
      return;
    }
    const responseHeaders = { 'Cache-Control': 'public, max-age=31536000, immutable' };
    if (proxyRes.headers['content-type']) responseHeaders['Content-Type'] = proxyRes.headers['content-type'];
    if (proxyRes.headers['content-length']) responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => { if (!destroyed) { destroyed = true; res.set('Content-Type', 'image/png'); res.send(placeholderImg); } });
  proxyReq.on('timeout', () => { if (!destroyed) { destroyed = true; proxyReq.destroy(); res.set('Content-Type', 'image/png'); res.send(placeholderImg); } });
  proxyReq.end();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/debug/proxy', (req, res) => {
  const https = require('https');
  const url = req.query.url || '/cdn/shop/files/kemsau_e755cb2f-67c7-4369-b0cd-b77ce00ef3b9.png';
  const start = Date.now();
  let timedOut = false;
  let responded = false;
  const options = {
    hostname: '23.227.38.74',
    port: 443,
    path: url,
    method: 'GET',
    headers: { 'Host': 'luonvuituoi.co' },
    servername: 'luonvuituoi.co',
    rejectUnauthorized: false,
    timeout: 15000
  };
  const proxyReq = https.request(options, (proxyRes) => {
    let d = [];
    proxyRes.on('data', c => d.push(c));
    proxyRes.on('end', () => {
      if (!responded) { responded = true;
        res.json({ status: proxyRes.statusCode, type: proxyRes.headers['content-type'], bytes: d.reduce((a,b)=>a+b.length,0), time: Date.now()-start, path: url });
      }
    });
  });
  proxyReq.on('error', (err) => { if (!responded) { responded = true; res.json({ error: err.message, code: err.code, path: url }); } });
  proxyReq.on('timeout', () => { if (!responded) { responded = true; timedOut = true; proxyReq.destroy(); res.json({ error: 'timeout', time: Date.now()-start, path: url }); } });
  proxyReq.end();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(optionalAuth);
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.session = req.session;
  res.locals.customer = req.customer;
  next();
});

const authRoutes = require('./backend/routes/auth');
const productRoutes = require('./backend/routes/products');
const categoryRoutes = require('./backend/routes/categories');
const cartRoutes = require('./backend/routes/cart');
const orderRoutes = require('./backend/routes/orders');
const searchRoutes = require('./backend/routes/search');
const adminRoutes = require('./backend/routes/admin');
const bridgeRoutes = require('./backend/routes/bridge');
const pageRoutes = require('./backend/routes/pages');
const contactRoutes = require('./backend/routes/contact');
const checkoutRoutes = require('./backend/routes/checkout');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', contactRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/', bridgeRoutes);
app.use('/', pageRoutes);



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', { message: 'Something went wrong!' });
});

async function initializeDatabase() {
  try {
    const { createTables } = require('./backend/database/schema');
    await createTables();
    console.log('Database tables initialized');
    const bcrypt = require('bcryptjs');
    const pool = require('./backend/database/db');
    const [existing] = await pool.query('SELECT id FROM admin_users WHERE username = ?', ['admin']);
    if (existing.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'admin@luonvuituoi.co', hash, 'Admin', 'admin']
      );
      console.log('Default admin created: admin / admin123');
    }
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

async function runSeedIfNeeded() {
  try {
    const pool = require('./backend/database/db');
    const [banners] = await pool.query('SELECT COUNT(*) as cnt FROM banners WHERE image LIKE ?', ['%/img-placeholder%']);
    const needsFullSeed = banners[0].cnt > 0;
    const [featured] = await pool.query('SELECT COUNT(*) as cnt FROM products WHERE featured = TRUE');
    const needsFeaturedFix = featured[0].cnt === 0;

    if (needsFullSeed) {
      console.log(`Fixing ${banners[0].cnt} banners with placeholder images, re-running seed...`);
      await pool.query('DELETE FROM banners');
      await require('./backend/database/seed-data')();
      return;
    }

    if (needsFeaturedFix) {
      console.log('No featured products found, fixing featured flags...');
      const [active] = await pool.query('SELECT id FROM products WHERE status = ? ORDER BY id ASC LIMIT 8', ['active']);
      for (let i = 0; i < active.length; i++) {
        await pool.query('UPDATE products SET featured = TRUE WHERE id = ?', [active[i].id]);
      }
      await pool.query('UPDATE products SET featured = FALSE WHERE id NOT IN (' + active.map(() => '?').join(',') + ')', active.map(p => p.id));
      console.log(`Marked ${active.length} products as featured`);
      return;
    }

    const [bannerCount] = await pool.query('SELECT COUNT(*) as cnt FROM banners');
    if (bannerCount[0].cnt === 0) {
      console.log('No banners found, running data seed...');
      await require('./backend/database/seed-data')();
    } else {
      console.log(`Banners already seeded (${bannerCount[0].cnt}), skipping`);
    }
  } catch (err) {
    console.error('Seed check error:', err.message);
  }
}

app.listen(PORT, async () => {
  await initializeDatabase();
  await runSeedIfNeeded();
  console.log(`Server running on http://localhost:${PORT}`);
});
