const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Product = require('../models/product');
const Category = require('../models/category');
const pool = require('../database/db');

const readOriginalHTML = (filePath) => {
  const basePath = path.join(__dirname, '..', '..', filePath);
  let resolvedPath = null;
  if (fs.existsSync(basePath)) {
    resolvedPath = basePath;
  } else {
    const dir = path.dirname(basePath);
    const base = path.basename(basePath);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const tmpFile = files.find(f => f === base + '.tmp');
      const zFile = files.find(f => f === base + '.z');
      if (tmpFile) resolvedPath = path.join(dir, tmpFile);
      else if (zFile) resolvedPath = path.join(dir, zFile);
    }
  }
  if (resolvedPath) {
    let html = fs.readFileSync(resolvedPath, 'utf8');
    if (!filePath.startsWith('admin') && !filePath.includes('admin/')) {
      html = html.replace('</body>', '<script src="/js/bridge.js"></script></body>');
    }
    return html;
  }
  return null;
};

router.get('/', async (req, res) => {
  try {
    const result = await Product.findAll({ featured: true, limit: 8 });
    const categories = await Category.findAllWithProductCount();
    const html = readOriginalHTML('index.html');
    res.send(html);
  } catch (err) {
    const html = readOriginalHTML('index.html');
    if (html) return res.send(html);
    res.status(500).send('Error');
  }
});

router.get('/cart', (req, res) => {
  const html = readOriginalHTML('cart.html');
  if (html) return res.send(html);
  res.status(404).send('Cart page not found');
});

router.get('/collections/:slug', async (req, res) => {
  const possibleFiles = [
    `collections/${req.params.slug}.html`,
    `collections/${req.params.slug}4658.html`,
    `collections/${req.params.slug}9ba9.html`
  ];
  for (const f of possibleFiles) {
    const html = readOriginalHTML(f);
    if (html) return res.send(html);
  }
  try {
    const category = await Category.findBySlug(req.params.slug);
    if (!category) {
      const allHtml = readOriginalHTML('collections/all.html');
      if (allHtml) return res.send(allHtml);
      return res.status(404).send('Collection not found');
    }
    const { products } = await Product.findAll({ category: category.id, limit: 100 });
    const indexHtml = readOriginalHTML('index.html');
    if (!indexHtml) return res.status(500).send('Error');

    const mainStart = indexHtml.indexOf('<main role="main"');
    const mainEnd = indexHtml.indexOf('</main>', mainStart);

    if (mainStart === -1 || mainEnd === -1) return res.send(indexHtml);

    const headerPart = indexHtml.substring(0, mainStart);
    const footerPart = indexHtml.substring(mainEnd + 7);

    const productRows = products.map((p, i) => {
      const price = p.sale_price || p.price;
      const comparePrice = p.compare_price || p.price;
      const pct = comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : 0;
      const images = p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : [];
      const img = images[0] || '';
      const imgSrc = img.startsWith('http') ? img : (img ? '/' + img.replace(/^\//, '') : '');
      const showSale = pct > 0;
      const hasHover = images.length > 1;
      const hoverImg = hasHover ? images[1] : '';
      const hoverSrc = hoverImg.startsWith('http') ? hoverImg : (hoverImg ? '/' + hoverImg.replace(/^\//, '') : '');

      return `<div class="swiper-slide m:column">
<div class="m-product-card m-product-card--style-1${showSale ? ' m-product-card--onsale' : ''}${hasHover ? ' m-product-card--show-second-img' : ''} m-scroll-trigger animate--fade-in" data-view="card" data-product-id="${p.id}" data-cascade style="--animation-order: ${i + 1};">
  <div class="m-product-card__media">
    <a class="m-product-card__link m:block m:w-full" href="/products/${p.slug}" aria-label="${p.name}">
      <div class="m-product-card__main-image"><responsive-image class="m-image" style="--aspect-ratio: 0.75"><img src="${imgSrc}" alt="${p.name}" width="400" height="533" fetchpriority="low" class="m:w-full m:h-full" sizes="(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)"></responsive-image></div>${hasHover ? `<div class="m-product-card__hover-image"><responsive-image class="m-image" style="--aspect-ratio: 0.75"><img src="${hoverSrc}" alt="${p.name}" width="400" height="533" class="m:w-full m:h-full" sizes="(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)"></responsive-image></div>` : ''}
    </a>
    <div class="m-product-card__tags">${showSale ? `<span class="m-product-card__tag-name m-product-tag m-product-tag--sale m-gradient m-color-badge-sale">-${pct}%</span>` : ''}</div>
    <span class="m-product-tag m-product-tag--soldout m-gradient m-color-footer" style="display: ${p.stock && p.stock <= 0 ? 'flex' : 'none'};">Bán hết</span>
    <div class="m-product-card__action m:hidden lg:m:block"></div>
  </div>
  <div class="m-product-card__content m:text-left">
    <div class="m-product-card__info">
      <h3 class="m-product-card__title"><a href="/products/${p.slug}" class="m-product-card__name">${p.name}</a></h3>
      <div class="m-product-card__price">
        <div class="m-price m:inline-flex m:items-center m:flex-wrap ${showSale ? 'm-price--on-sale' : ''}" data-sale-badge-type="percentage">
          <div class="m-price__regular"><span class="m:visually-hidden m:visually-hidden--inline">Giá cả phải chăng</span><span class="m-price-item m-price-item--regular">${price.toLocaleString('vi-VN')}₫</span></div>
          ${showSale ? `<div class="m-price__sale"><span class="m:visually-hidden m:visually-hidden--inline">Giá bán</span><span class="m-price-item m-price-item--sale m-price-item--last">${price.toLocaleString('vi-VN')}₫</span><span class="m-price-item m-price-item--compare">${comparePrice.toLocaleString('vi-VN')}₫</span></div>` : ''}
        </div>
      </div>
    </div>
  </div>
</div>
</div>`;
    }).join('\n');

    const html = headerPart +
      `<!-- END sections: header-group --><main role="main" id="MainContent">
<div class="container-fluid" style="padding-top:30px;padding-bottom:30px;">
  <h1 class="m:font-medium m:text-3xl md:m:text-4xl" style="margin-bottom:24px;">${category.name}</h1>
  <div class="m:grid m:grid-cols-2 md:m:grid-cols-3 lg:m:grid-cols-4 m:gap-4">${productRows}</div>
</div>
</main>` +
      footerPart;

    res.send(html);
  } catch (err) {
    console.error('Collection route error:', err);
    res.status(500).send('Error loading collection');
  }
});

router.get('/products/:slug', async (req, res) => {
  let slug = req.params.slug;
  slug = slug.replace(/\.html$/i, '');
  let html = readOriginalHTML(`products/${slug}.html`);
  if (html) return res.send(html);
  try {
    const product = await Product.findBySlug(slug);
    if (product) {
      const indexHtml = readOriginalHTML('index.html');
      if (indexHtml) return res.send(indexHtml);
    }
  } catch {}
  res.status(404).send('Product not found');
});

router.get('/collections/products/:slug', async (req, res) => {
  let slug = req.params.slug;
  slug = slug.replace(/\.html$/i, '');
  let html = readOriginalHTML(`products/${slug}.html`);
  if (html) return res.send(html);
  try {
    const product = await Product.findBySlug(slug);
    if (product) {
      const indexHtml = readOriginalHTML('index.html');
      if (indexHtml) return res.send(indexHtml);
    }
  } catch {}
  res.status(404).send('Product not found');
});

router.get('/pages/:slug', (req, res) => {
  const pageMap = {
    'lien-he': 'pages/contact.html',
    'gioi-thieu': 'pages/gioi-thieu.html',
    'chinh-sach-bao-mat': 'pages/chinh-sach-bao-mat-thong-tin.html',
    'chinh-sach-doi-tra': 'pages/chinh-sach-doi-tra.html',
    'chinh-sach-giao-nhan': 'pages/chinh-sach-giao-nhan-hang-va-kiem-hang.html',
    'chinh-sach-thanh-toan': 'pages/chinh-sach-thanh-toan.html',
    'dieu-khoan-dich-vu': 'pages/dieu-khoan-dich-vu.html'
  };
  const file = pageMap[req.params.slug] || `pages/${req.params.slug}.html`;
  const html = readOriginalHTML(file);
  if (html) return res.send(html);
  res.status(404).send('Page not found');
});

router.get('/account', (req, res) => {
  const html = readOriginalHTML('account/login.html');
  if (html) return res.send(html);
  res.status(404).send('Account page not found');
});

router.get('/account/login', (req, res) => {
  const html = readOriginalHTML('account/login.html');
  if (html) return res.send(html);
  res.status(404).send('Login page not found');
});

router.get('/account/register', (req, res) => {
  const html = readOriginalHTML('account/register.html');
  if (html) return res.send(html);
  res.status(404).send('Register page not found');
});

router.get('/account/profile', (req, res) => {
  const html = readOriginalHTML('account/profile.html');
  if (html) return res.send(html);
  res.redirect('/account/login');
});

router.get('/account/orders', (req, res) => {
  const html = readOriginalHTML('account/orders.html');
  if (html) return res.send(html);
  res.redirect('/account/login');
});

router.get('/account/addresses', (req, res) => {
  const html = readOriginalHTML('account/addresses.html');
  if (html) return res.send(html);
  res.redirect('/account/login');
});

router.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'views', 'admin', 'login.html'));
});

router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'views', 'admin', 'index.html'));
});

router.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'views', 'admin', 'index.html'));
});

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.redirect('/');
  try {
    const products = await Product.search(q);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/order/confirm/:id', async (req, res) => {
  try {
    const Order = require('../models/order');
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send('Đơn hàng không tồn tại');
    res.render('order-confirm', { orderNumber: order.order_number });
  } catch (err) {
    res.status(500).send('Lỗi');
  }
});

module.exports = router;
