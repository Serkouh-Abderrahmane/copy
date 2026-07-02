const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Product = require('../models/product');
const Category = require('../models/category');
const pool = require('../database/db');

const resolveImageSrc = (img) => {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  return '/' + img.replace(/^\//, '');
};

const renderProductCard = (p, index) => {
  const price = p.sale_price || p.price;
  const comparePrice = p.compare_price || p.price;
  const pct = comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : 0;
  const images = p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : [];
  const img = images[0] || '';
  const imgSrc = resolveImageSrc(img);
  const showSale = pct > 0;
  const hasHover = images.length > 1;
  const hoverImg = hasHover ? images[1] : '';
  const hoverSrc = resolveImageSrc(hoverImg);

  return `<div class="swiper-slide m:column">
<div class="m-product-card m-product-card--style-1${showSale ? ' m-product-card--onsale' : ''}${hasHover ? ' m-product-card--show-second-img' : ''} m-scroll-trigger animate--fade-in" data-view="card" data-product-id="${p.id}" data-cascade style="--animation-order: ${index + 1};">
  <div class="m-product-card__media">
    <a class="m-product-card__link m:block m:w-full" href="/products/${p.slug}" aria-label="${p.name.replace(/"/g, '&quot;')}">
      <div class="m-product-card__main-image"><responsive-image class="m-image" style="--aspect-ratio: 0.75"><img src="${imgSrc}" alt="${p.name.replace(/"/g, '&quot;')}" width="400" height="533" fetchpriority="low" class="m:w-full m:h-full" sizes="(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)"></responsive-image></div>${hasHover ? `<div class="m-product-card__hover-image"><responsive-image class="m-image" style="--aspect-ratio: 0.75"><img src="${hoverSrc}" alt="${p.name.replace(/"/g, '&quot;')}" width="400" height="533" class="m:w-full m:h-full" sizes="(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)"></responsive-image></div>` : ''}
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
};

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
      html = html.replace(/https:\/\/luonvuituoi\.co\//g, '/');
      html = html.replace('<head>', '<head><base href="/">');
      html = html.replace(/Banner_Ngang_(\d)_([a-f0-9-]+)\.(png|jpg|webp)/g, 'Banner_Ngang_$1.$3');
      html = html.replace(/Banner_Ngang_(\d)[a-f0-9]+\.(png|jpg|webp)/g, 'Banner_Ngang_$1.$2');
      html = html.replace('</body>', '<script src="/js/bridge.js"></script><script src="/js/dynamic.js"></script></body>');

    }
    return html;
  }
  return null;
};

function injectBetween(html, startMarker, endMarker, content) {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return html;
  const contentStart = startIdx + startMarker.length;
  const endIdx = html.indexOf(endMarker, contentStart);
  if (endIdx === -1) return html;
  return html.slice(0, contentStart) + content + html.slice(endIdx);
}

router.get('/', async (req, res) => {
  try {
    let result = await Product.findAll({ featured: true, limit: 8 });
    let featured = result.products || [];
    if (featured.length === 0) {
      result = await Product.findAll({ sort: 'newest', limit: 8 });
      featured = result.products || [];
    }
    const categories = await Category.findAllWithProductCount();
    let html = readOriginalHTML('index.html');

    if (featured.length > 0) {
      const productCards = featured.map((p, i) => renderProductCard(p, i)).join('\n');
      const startMarker = 'data-products-container';
      const startIdx = html.indexOf(startMarker);
      if (startIdx !== -1) {
        const containerStart = html.indexOf('>', startIdx) + 1;
        const containerEnd = html.indexOf('</div>', containerStart);
        let nextContainer = containerEnd;
        let depth = 1;
        while (depth > 0 && nextContainer < html.length) {
          const nextOpen = html.indexOf('<div', nextContainer + 1);
          const nextClose = html.indexOf('</div>', nextContainer + 1);
          if (nextClose === -1) break;
          if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            nextContainer = nextOpen + 4;
          } else {
            depth--;
            nextContainer = nextClose;
          }
        }
        if (depth === 0) {
          html = html.slice(0, containerStart) + '\n' + productCards + '\n' + html.slice(nextContainer + 6);
        }
      }

      html = html.replace(
        /(featured_collection[\s\S]*?m-section__heading[^>]*>)[^<]*(<\/h2>)/,
        '$1Sản phẩm nổi bật$2'
      );

      const collectionUrlIdx = html.indexOf('data-url=');
      if (collectionUrlIdx !== -1) {
        const urlStart = html.indexOf('"', collectionUrlIdx + 9) + 1;
        const urlEnd = html.indexOf('"', urlStart);
        if (urlStart !== -1 && urlEnd !== -1) {
          html = html.slice(0, urlStart) + '/collections/all' + html.slice(urlEnd);
        }
      }
    }

    res.send(html);
  } catch (err) {
    console.error('Homepage error:', err);
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

async function renderAllProducts(req, res) {
  try {
    const result = await Product.findAll({ limit: 200 });
    const products = result.products || [];
    const indexHtml = readOriginalHTML('index.html');
    if (!indexHtml) return res.status(500).send('Error');
    const mainStart = indexHtml.indexOf('<main role="main"');
    const mainEnd = indexHtml.indexOf('</main>', mainStart);
    if (mainStart === -1 || mainEnd === -1) return res.send(indexHtml);
    const headerPart = indexHtml.substring(0, mainStart);
    const footerPart = indexHtml.substring(mainEnd + 7);
    const productRows = products.map((p, i) => renderProductCard(p, i)).join('\n');
    const html = headerPart +
      `<main role="main" id="MainContent">
<div class="container-fluid" style="padding-top:30px;padding-bottom:30px;">
  <h1 class="m:font-medium m:text-3xl md:m:text-4xl" style="margin-bottom:24px;">Tất cả sản phẩm</h1>
  <div class="m:grid m:grid-cols-2 md:m:grid-cols-3 lg:m:grid-cols-4 m:gap-4">${productRows}</div>
</div>
</main>` +
      footerPart;
    res.send(html);
  } catch (err) {
    console.error('All products error:', err);
    res.status(500).send('Error');
  }
}

router.get('/collections/:slug', async (req, res) => {
  const slug = req.params.slug;
  if (slug === 'all') {
    return renderAllProducts(req, res);
  }
  const possibleFiles = [
    `collections/${slug}.html`,
    `collections/${slug}4658.html`,
    `collections/${slug}9ba9.html`
  ];
  for (const f of possibleFiles) {
    const html = readOriginalHTML(f);
    if (html) return res.send(html);
  }
  try {
    const category = await Category.findBySlug(slug);
    if (!category) return renderAllProducts(req, res);
    const { products } = await Product.findAll({ category: category.id, limit: 100 });
    const indexHtml = readOriginalHTML('index.html');
    if (!indexHtml) return res.status(500).send('Error');

    const mainStart = indexHtml.indexOf('<main role="main"');
    const mainEnd = indexHtml.indexOf('</main>', mainStart);

    if (mainStart === -1 || mainEnd === -1) return res.send(indexHtml);

    const headerPart = indexHtml.substring(0, mainStart);
    const footerPart = indexHtml.substring(mainEnd + 7);

    const productRows = products.map((p, i) => renderProductCard(p, i)).join('\n');

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
      if (!indexHtml) return res.status(500).send('Error');
      const images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
      const variants = await Product.getVariants(product.id);
      const related = await Product.getRelated(product.id, product.category_id, 4);

      const mainStart = indexHtml.indexOf('<main role="main"');
      const mainEnd = indexHtml.indexOf('</main>', mainStart);
      if (mainStart === -1 || mainEnd === -1) return res.send(indexHtml);
      const headerPart = indexHtml.substring(0, mainStart);
      const footerPart = indexHtml.substring(mainEnd + 7);

      const mainImg = images[0] || '';
      const mainImgSrc = resolveImageSrc(mainImg);
      const price = product.sale_price || product.price;
      const comparePrice = product.compare_price || product.price;
      const pct = comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : 0;

      html = headerPart +
        `<main role="main" id="MainContent">
<div class="container-fluid" style="padding-top:30px;">
  <nav class="m-breadcrumb m:hidden md:m:flex m-scroll-trigger animate--fade-in" role="navigation" aria-label="Breadcrumbs">
    <div class="m-breadcrumb__wrapper">
      <a href="/" class="m-breadcrumb__item">Trang chủ</a>
      <span aria-hidden="true" class="m-breadcrumb__separator">/</span>
      ${product.category_name ? `<a href="/collections/${product.category_slug}" class="m-breadcrumb__item">${product.category_name}</a><span aria-hidden="true" class="m-breadcrumb__separator">/</span>` : ''}
      <span class="m-breadcrumb__item m-breadcrumb__item--current">${product.name}</span>
    </div>
  </nav>
  <div class="m-product m-scroll-trigger animate--fade-in">
    <div class="m:grid m:grid-cols-1 md:m:grid-cols-2 m:gap-8">
      <div class="m-product__media">
        <div class="m-product__media-wrapper">
          <div class="m-product__main-image">
            <responsive-image class="m-image" style="--aspect-ratio: 0.75">
              <img src="${mainImgSrc}" alt="${product.name}" width="800" height="1067" fetchpriority="high" class="m:w-full m:h-full" sizes="(min-width: 1200px) 600px, (min-width: 990px) calc((100vw - 130px) / 2), 100vw">
            </responsive-image>
          </div>
          ${images.length > 1 ? `<div class="m:grid m:grid-cols-4 m:gap-2 m:mt-4">` + images.slice(1).map(img => {
            const src = resolveImageSrc(img);
            return `<div class="m-product__thumbnail"><responsive-image class="m-image" style="--aspect-ratio: 0.75"><img src="${src}" alt="${product.name}" width="200" height="267" class="m:w-full m:h-full" loading="lazy"></responsive-image></div>`;
          }).join('') + `</div>` : ''}
        </div>
      </div>
      <div class="m-product__info">
        <h1 class="m-product__title h2">${product.name}</h1>
        <div class="m-product__price">
          <div class="m-price m:inline-flex m:items-center m:flex-wrap ${pct > 0 ? 'm-price--on-sale' : ''}">
            <div class="m-price__regular"><span class="m-price-item m-price-item--regular">${price.toLocaleString('vi-VN')}₫</span></div>
            ${pct > 0 ? `<div class="m-price__sale"><span class="m-price-item m-price-item--sale">${price.toLocaleString('vi-VN')}₫</span><s class="m-price-item m-price-item--compare">${comparePrice.toLocaleString('vi-VN')}₫</s></div>` : ''}
          </div>
        </div>
        ${product.short_description ? `<div class="m-product__description m:mt-4"><p>${product.short_description}</p></div>` : ''}
        <div class="m-product__form m:mt-6">
          <form method="post" action="/cart/add" class="m-product-form">
            <input type="hidden" name="id" value="${product.id}">
            <div class="m-product__quantity m:mb-4">
              <label class="m:block m:mb-2 m:text-sm m:font-medium">Số lượng</label>
              <div class="m-quantity" data-quantity>
                <button type="button" name="minus" class="m-quantity__button" onclick="this.parentNode.querySelector('input').stepDown();this.parentNode.querySelector('input').dispatchEvent(new Event('change'))">−</button>
                <input class="m-quantity__input" type="number" name="quantity" value="1" min="1" max="${product.stock || 99}">
                <button type="button" name="plus" class="m-quantity__button" onclick="this.parentNode.querySelector('input').stepUp();this.parentNode.querySelector('input').dispatchEvent(new Event('change'))">+</button>
              </div>
            </div>
            <button type="submit" class="m-button m-button--primary m:w-full" ${product.stock <= 0 ? 'disabled' : ''}>
              ${product.stock <= 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
  ${product.description ? `<div class="m-product__description-full m:mt-8 m:p-6 m:bg-gray-50"><h2 class="h3 m:mb-4">Mô tả sản phẩm</h2><div>${product.description}</div></div>` : ''}
  ${related.length > 0 ? `<div class="m:mt-12"><h2 class="h3 m:mb-6">Sản phẩm liên quan</h2><div class="m:grid m:grid-cols-2 md:m:grid-cols-4 m:gap-4">${related.map((r, i) => renderProductCard(r, i)).join('')}</div></div>` : ''}
</div>
</main>` +
        footerPart;
      return res.send(html);
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
      if (!indexHtml) return res.status(500).send('Error');
      const mainStart = indexHtml.indexOf('<main role="main"');
      const mainEnd = indexHtml.indexOf('</main>', mainStart);
      const beforeBody = indexHtml.lastIndexOf('</body>');

      let result;
      if (mainStart !== -1 && mainEnd !== -1) {
        const beforeMain = indexHtml.substring(0, mainStart);
        const afterMain = indexHtml.substring(mainEnd + 7);
        result = beforeMain +
          '<main role="main" id="MainContent" data-product="true"><div class="container-fluid" style="text-align:center;padding:80px 20px;min-height:400px"><p style="color:#999">Đang tải...</p></div></main>' +
          afterMain;
      } else {
        result = indexHtml;
      }

      if (beforeBody !== -1) {
        result = result.slice(0, beforeBody) +
          '<script src="/js/product.js" defer></script>' +
          result.slice(beforeBody);
      }

      return res.send(result);
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
