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
function createHttrackStatic(baseDir) {
  const staticMw = express.static(baseDir);
  return (req, res, next) => {
    staticMw(req, res, (err) => {
      if (err) return next(err);
      if (res.headersSent) return;
      const filename = path.basename(req.path);
      const dir = path.dirname(path.join(baseDir, req.path));
      if (!fs.existsSync(dir)) return next();
      const files = fs.readdirSync(dir).filter(f => !f.endsWith('.tmp') && !f.endsWith('.z'));
      const ext = path.extname(filename);
      const base = filename.slice(0, -ext.length);
      const suffixMatch = files.find(f => f.startsWith(base) && f.length === filename.length + 4 && f.endsWith(ext));
      if (suffixMatch) return res.sendFile(path.join(dir, suffixMatch));
      const prefix = base.split(/_[a-f0-9-]+$/)[0];
      if (prefix && prefix.length > 3) {
        const prefixMatch = files.find(f => f.startsWith(prefix) && f.endsWith(ext));
        if (prefixMatch) return res.sendFile(path.join(dir, prefixMatch));
      }
      next();
    });
  };
}

app.use('/cdn', createHttrackStatic(path.join(__dirname, 'cdn')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
const apiRoutes = require('./backend/routes/api');
const checkoutRoutes = require('./backend/routes/checkout');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', contactRoutes);
app.use('/api', apiRoutes);
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

app.listen(PORT, async () => {
  await initializeDatabase();
  console.log(`Server running on http://localhost:${PORT}`);
});
