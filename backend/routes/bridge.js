const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const multipart = multer().none();

const getCart = async (customerId, sessionId) => {
  if (customerId) {
    let [carts] = await pool.query('SELECT * FROM carts WHERE customer_id = ?', [customerId]);
    if (carts.length > 0) return carts[0].id;
    if (sessionId) {
      let [sessionCarts] = await pool.query('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
      if (sessionCarts.length > 0) {
        await pool.query('UPDATE carts SET customer_id = ? WHERE id = ?', [customerId, sessionCarts[0].id]);
        return sessionCarts[0].id;
      }
    }
    const [r] = await pool.query('INSERT INTO carts (customer_id) VALUES (?)', [customerId]);
    return r.insertId;
  }
  if (sessionId) {
    let [carts] = await pool.query('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
    if (carts.length > 0) return carts[0].id;
    const [r] = await pool.query('INSERT INTO carts (session_id) VALUES (?)', [sessionId]);
    return r.insertId;
  }
  return null;
};

async function getCartData(cartId) {
  const [items] = await pool.query(
    `SELECT ci.*, p.name as product_name, p.price, p.sale_price, p.images, p.slug 
     FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?`,
    [cartId]
  );
  const total = items.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0);
  return { items, total };
}

function toShopifyCart(items, total) {
  const shopifyItems = (items || []).map(i => {
    const price = i.sale_price || i.price;
    const images = i.images ? (typeof i.images === 'string' ? JSON.parse(i.images) : i.images) : [];
    const imgUrl = images[0] || '';
    return {
      id: i.id,
      variant_id: i.variant_id || i.product_id,
      product_id: i.product_id,
      image: imgUrl,
      title: i.product_name,
      product_title: i.product_name,
      variant_title: null,
      price: price * 100,
      original_price: price * 100,
      quantity: i.quantity,
      line_price: price * i.quantity * 100,
      original_line_price: price * i.quantity * 100,
      discounted_price: price * 100,
      discounts: [],
      properties: null,
      sku: i.sku || '',
      grams: 0,
      vendor: 'Luon Vuituoi',
      taxable: true,
      product_has_only_default_variant: true,
      gift_card: false,
      final_price: price * 100,
      final_line_price: price * i.quantity * 100,
      url: '/products/' + (i.slug || ''),
      featured_image: { url: imgUrl.startsWith('http') ? imgUrl : (imgUrl ? '/' + imgUrl.replace(/^\//, '') : '') }
    };
  });
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + (i.sale_price || i.price) * i.quantity, 0);
  return {
    token: 'bridge',
    items: shopifyItems,
    items_count: totalItems,
    total_price: totalPrice * 100,
    original_total_price: totalPrice * 100,
    total_discount: 0,
    item_count: totalItems,
    currency: 'VND',
    note: null,
    requires_shipping: true,
    items_subtotal_price: totalPrice * 100,
    cart_level_discount_applications: []
  };
}

function renderCartDrawerHTML(items) {
  if (!items || items.length === 0) {
    return '<div class="m-cart-drawer__empty"><p>Giỏ hàng trống</p></div>';
  }
  return items.map(i => {
    const price = i.sale_price || i.price;
    const images = i.images ? (typeof i.images === 'string' ? JSON.parse(i.images) : i.images) : [];
    const img = images[0] || '';
    const imgSrc = img.startsWith('http') ? img : (img ? '/' + img.replace(/^\//, '') : '');
    return `<div class="m-cart-item" data-cart-item data-key="${i.id}">
      <div class="m-cart-item__media">
        <a href="/products/${i.slug || ''}">
          ${imgSrc ? `<img src="${imgSrc}" alt="${i.product_name}" loading="lazy" width="100">` : '<div class="m-placeholder" style="width:100px;height:100px;background:#f3f3f3"></div>'}
        </a>
      </div>
      <div class="m-cart-item__details">
        <a href="/products/${i.slug || ''}" class="m-cart-item__name">${i.product_name}</a>
        <div class="m-cart-item__prices"><span class="m-cart-item__price">${price.toLocaleString('vi-VN')}₫</span></div>
        <div class="m-quantity" data-quantity>
          <button name="minus" class="m-quantity__button" onclick="changeQty(${i.id},-1)">−</button>
          <input class="m-quantity__input" type="number" value="${i.quantity}" min="0" readonly>
          <button name="plus" class="m-quantity__button" onclick="changeQty(${i.id},1)">+</button>
        </div>
      </div>
      <button class="m-cart-item__remove" onclick="removeItem(${i.id})" aria-label="Xóa">×</button>
    </div>`;
  }).join('');
}

// GET /cart.json - Shopify-compatible cart JSON
router.get('/cart.json', async (req, res) => {
  try {
    const sessionId = req.cookies?.cart_session || uuidv4();
    const cartId = await getCart(req.customer?.id, sessionId);
    if (!cartId) return res.json(toShopifyCart([], 0));
    const { items, total } = await getCartData(cartId);
    res.json(toShopifyCart(items, total));
  } catch (err) { res.status(500).json(toShopifyCart([], 0)); }
});

// GET /cart.js - alias for cart.json (legacy Shopify endpoint)
router.get('/cart.js', async (req, res) => {
  try {
    const sessionId = req.cookies?.cart_session || uuidv4();
    const cartId = await getCart(req.customer?.id, sessionId);
    if (!cartId) return res.json(toShopifyCart([], 0));
    const { items, total } = await getCartData(cartId);
    res.json(toShopifyCart(items, total));
  } catch (err) { res.status(500).json(toShopifyCart([], 0)); }
});

async function resolveProductId(input) {
  if (input == null) return null;
  const num = Number(input);
  if (!isNaN(num) && num > 0 && num <= 2147483647) {
    const [p] = await pool.query('SELECT id FROM products WHERE id = ?', [num]);
    if (p.length > 0) return p[0].id;
  }
  try {
    const [v] = await pool.query('SELECT product_id FROM shopify_variants WHERE id = ?', [String(input)]);
    if (v.length > 0) return v[0].product_id;
  } catch (e) {
    // shopify_variants table may not exist - ignore
  }
  const [s] = await pool.query('SELECT id FROM products WHERE slug = ?', [String(input)]);
  if (s.length > 0) return s[0].id;
  return null;
}

// POST /cart/add - Shopify-compatible add to cart
router.post('/cart/add', multipart, async (req, res) => {
  try {
    let rawProductId = req.body.id || req.body.product_id;
    let quantity = parseInt(req.body.quantity) || 1;
    let productId = null;
    if (rawProductId) {
      productId = await resolveProductId(rawProductId);
    }
    if (!productId && req.body.product_handle) {
      const [s] = await pool.query('SELECT id FROM products WHERE slug = ?', [req.body.product_handle]);
      if (s.length > 0) productId = s[0].id;
    }
    if (!productId) return res.status(400).json({ status: 400, message: 'Invalid product ID', description: 'Sản phẩm không tồn tại' });

    const sessionId = req.cookies?.cart_session || uuidv4();
    if (!req.cookies?.cart_session) res.cookie('cart_session', sessionId, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
    const cartId = await getCart(req.customer?.id, sessionId);
    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND (variant_id IS NULL OR variant_id = ?)',
      [cartId, productId, req.body.variant_id || null]
    );
    if (existing.length > 0) {
      await pool.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing[0].id]);
    } else {
      await pool.query('INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)',
        [cartId, productId, req.body.variant_id || null, quantity]);
    }
    const { items, total } = await getCartData(cartId);
    const shopifyCart = toShopifyCart(items, total);
    const sections = {
      'cart-drawer': renderCartDrawerHTML(items),
      'cart-icon-bubble': `<span class="m-cart-count-bubble m-cart-count${shopifyCart.item_count > 0 ? '' : ' m:hidden'}">${shopifyCart.item_count}</span>`
    };
    res.json({ ...shopifyCart, sections, id: Date.now().toString() });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message, description: 'Lỗi khi thêm vào giỏ hàng' });
  }
});

// POST /cart/change - Shopify-compatible cart change
router.post('/cart/change', async (req, res) => {
  try {
    const { id: itemId, quantity } = req.body;
    const sessionId = req.cookies?.cart_session;
    const cartId = await getCart(req.customer?.id, sessionId);
    if (quantity <= 0) {
      await pool.query('DELETE FROM cart_items WHERE id = ?', [itemId]);
    } else {
      await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
    }
    const { items, total } = await getCartData(cartId);
    const shopifyCart = toShopifyCart(items, total);
    const sections = { 'cart-drawer': renderCartDrawerHTML(items) };
    res.json({ ...shopifyCart, sections, id: Date.now().toString() });
  } catch (err) { res.status(500).json({ status: 500, message: err.message }); }
});

// POST /cart/update
router.post('/cart/update', async (req, res) => {
  try {
    const updates = req.body.updates || {};
    const sessionId = req.cookies?.cart_session;
    const cartId = await getCart(req.customer?.id, sessionId);
    for (const [itemId, qty] of Object.entries(updates)) {
      if (qty <= 0) await pool.query('DELETE FROM cart_items WHERE id = ?', [itemId]);
      else await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [qty, itemId]);
    }
    const { items, total } = await getCartData(cartId);
    res.json(toShopifyCart(items, total));
  } catch (err) { res.status(500).json({ status: 500, message: err.message }); }
});

// POST /cart/clear
router.post('/cart/clear', async (req, res) => {
  try {
    const sessionId = req.cookies?.cart_session;
    const cartId = await getCart(req.customer?.id, sessionId);
    if (cartId) await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    res.json(toShopifyCart([], 0));
  } catch (err) { res.status(500).json({ status: 500, message: err.message }); }
});

module.exports = router;
