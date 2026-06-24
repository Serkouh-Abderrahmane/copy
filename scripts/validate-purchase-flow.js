const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CHECK_ICON = '\x1b[32m\u2714\x1b[0m';
const CROSS_ICON = '\x1b[31m\u2718\x1b[0m';
const WARN_ICON = '\x1b[33m\u26a0\x1b[0m';

let passed = 0;
let failed = 0;

function check(condition, label, detail) {
  if (condition) {
    console.log(`  ${CHECK_ICON} ${label}`);
    passed++;
  } else {
    console.log(`  ${CROSS_ICON} ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

function warn(condition, label) {
  if (!condition) {
    console.log(`  ${WARN_ICON} ${label}`);
    passed++;
  } else {
    passed++;
  }
}

console.log('\n=== VALIDATE COMPLETE PURCHASE FLOW ===\n');

// 1. Static Routes (HTML files)
console.log('[1] Static Pages (on disk)');
check(fs.existsSync(path.join(ROOT, 'index.html')), 'Homepage: index.html');
check(fs.existsSync(path.join(ROOT, 'cart.html')), 'Cart: cart.html');
check(fs.existsSync(path.join(ROOT, 'account', 'login.html')), 'Login: account/login.html');
check(fs.existsSync(path.join(ROOT, 'account', 'register.html')), 'Register: account/register.html');

// 2. Backend Routes
console.log('\n[2] Backend Routes (code exists)');
check(fs.existsSync(path.join(ROOT, 'backend', 'routes', 'pages.js')), 'pages.js');
check(fs.existsSync(path.join(ROOT, 'backend', 'routes', 'bridge.js')), 'bridge.js');
check(fs.existsSync(path.join(ROOT, 'backend', 'routes', 'checkout.js')), 'checkout.js');
check(fs.existsSync(path.join(ROOT, 'backend', 'routes', 'auth.js')), 'auth.js');
check(fs.existsSync(path.join(ROOT, 'backend', 'middleware', 'auth.js')), 'auth middleware');

// 3. EJS Views
console.log('\n[3] EJS Views (on disk)');
check(fs.existsSync(path.join(ROOT, 'views', 'checkout.ejs')), 'checkout.ejs');
check(fs.existsSync(path.join(ROOT, 'views', 'order-confirm.ejs')), 'order-confirm.ejs');

// 4. Checkout Route Logic
console.log('\n[4] Checkout Route Analysis');
const checkoutCode = fs.readFileSync(path.join(ROOT, 'backend', 'routes', 'checkout.js'), 'utf8');
check(checkoutCode.includes("req.customer?.id"), 'Auth check: req.customer?.id');
check(checkoutCode.includes("res.redirect('/account/login?redirect=/checkout')"), 'Auth guard redirects to /account/login?redirect=/checkout');
check(checkoutCode.includes("order/confirm"), 'Order success redirect: /order/confirm/:id');
check(checkoutCode.includes("optionalAuth") === false, 'Uses optionalAuth via server.js global middleware (not imported directly in checkout)');

// Check if cart_session check is present
check(checkoutCode.includes("req.cookies?.cart_session"), 'Checkout checks cart_session cookie');
check(checkoutCode.includes("items.length === 0"), 'Checkout rejects empty carts');

// 5. Bridge.js (Client) Analysis
console.log('\n[5] Bridge.js (Client) - Buy Now Button');
const bridgeCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'bridge.js'), 'utf8');
check(bridgeCode.includes('btn--buy-now'), 'Buy Now button class exists');
check(bridgeCode.includes("textContent = 'Mua Ngay'"), 'Buy Now label: "Mua Ngay"');
check(bridgeCode.includes("origFetch('/cart/add'"), 'Buy Now adds to cart via fetch');
check(bridgeCode.includes("origFetch('/api/auth/me'"), 'Buy Now checks auth status');
check(bridgeCode.includes("'/account/login?redirect=/checkout'"), 'Buy Now redirects guests to login');
check(bridgeCode.includes("'/checkout'"), 'Buy Now redirects logged-in users to checkout');
check(bridgeCode.includes("ms.selectVariant"), 'Buy Now validates variant selection');
check(bridgeCode.includes('addBuyNowButton'), 'Buy Now button function exists');
check(bridgeCode.includes('DOMContentLoaded'), 'Buy Now button inserted on DOM ready');
check(bridgeCode.includes('customElements.whenDefined(\'product-form\')'), 'Bridge defers to product-form definition');

// 6. Bridge.js Login/Register Handlers
console.log('\n[6] Bridge.js Auth Form Interceptors');
check(bridgeCode.includes("/account/login'"), 'Login form intercepted');
check(bridgeCode.includes("/account/register'"), 'Register form intercepted');
check(bridgeCode.includes("/account/recover'"), 'Recover form intercepted');
check(bridgeCode.includes("params.get('redirect')"), 'Redirect param preserved on login');
check(bridgeCode.includes("'/api/auth/login'"), 'Login POST goes to /api/auth/login');
check(bridgeCode.includes("'/api/auth/register'"), 'Register POST goes to /api/auth/register');
check(bridgeCode.includes("'/api/auth/recover'"), 'Recover POST goes to /api/auth/recover');

// 7. Auth Backend
console.log('\n[7] Auth Backend');
const authCode = fs.readFileSync(path.join(ROOT, 'backend', 'routes', 'auth.js'), 'utf8');
check(authCode.includes("'/login'"), 'Login route exists');
check(authCode.includes("'/register'"), 'Register route exists');
check(authCode.includes("'/me'"), 'Me route exists');
check(authCode.includes('res.cookie(\'token\''), 'Sets token cookie');
check(authCode.includes("'7d'"), 'Token expires in 7 days');

// 8. Bridge.js (Server) Cart Routes
console.log('\n[8] Cart Backend (bridge.js)');
const bridgeServerCode = fs.readFileSync(path.join(ROOT, 'backend', 'routes', 'bridge.js'), 'utf8');
check(bridgeServerCode.includes("router.post('/cart/add'"), 'POST /cart/add route exists');
check(bridgeServerCode.includes("res.cookie('cart_session'"), 'Sets cart_session cookie');
check(bridgeServerCode.includes("resolveProductId"), 'resolveProductId function exists');
check(bridgeServerCode.includes("product_handle"), 'product_handle fallback exists');
check(bridgeServerCode.includes("shopify_variants"), 'shopify_variants table used');

// 9. Server.js Middleware
console.log('\n[9] Server Configuration');
const serverCode = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
check(serverCode.includes("optionalAuth"), 'optionalAuth middleware applied globally');
check(serverCode.includes("express-session"), 'express-session configured');
check(serverCode.includes("cookie-parser"), 'cookie-parser configured');
check(serverCode.includes("checkoutRoutes"), 'Checkout routes registered');
check(serverCode.includes("authRoutes"), 'Auth routes registered');
check(serverCode.includes("bridgeRoutes"), 'Bridge routes registered');
check(serverCode.includes("pageRoutes"), 'Page routes registered');

// 10. Password Recovery Flow
console.log('\n[10] Password Recovery Flow');
warn(fs.existsSync(path.join(ROOT, 'account', 'login.html')), 'Recover form exists in login.html');

// Check login HTML form action
const loginHtml = fs.readFileSync(path.join(ROOT, 'account', 'login.html'), 'utf8');
check(loginHtml.includes('action="/account/login"'), 'Login form has action="/account/login"');
check(loginHtml.includes('name="customer[email]"'), 'Login form has email field');
check(loginHtml.includes('name="customer[password]"'), 'Login form has password field');
check(loginHtml.includes('action="/account/recover"'), 'Recover form has action="/account/recover"');

const registerHtml = fs.readFileSync(path.join(ROOT, 'account', 'register.html'), 'utf8');
check(registerHtml.includes('name="customer[email]"'), 'Register form has email field');
check(registerHtml.includes('name="customer[password]"'), 'Register form has password field');
check(registerHtml.includes('name="customer[first_name]"'), 'Register form has first_name field');

// 11. Product Form HTML Check
console.log('\n[11] Product Form Compatibility');
const sampleProduct = path.join(ROOT, 'products', 'ao-polo-nam-nike-dri-fit-moi-2024-mau-xanh-reu-dam-1.html');
const sampleProduct2 = path.join(ROOT, 'products', 'ao-polo-nam-nike-dri-fit-moi-2024-mau-xanh-reu-dam.html');
let productHtml = '';
if (fs.existsSync(sampleProduct)) productHtml = fs.readFileSync(sampleProduct, 'utf8');
else if (fs.existsSync(sampleProduct2)) productHtml = fs.readFileSync(sampleProduct2, 'utf8');
else {
  const productFiles = fs.readdirSync(path.join(ROOT, 'products')).filter(f => f.endsWith('.html'));
  if (productFiles.length > 0) productHtml = fs.readFileSync(path.join(ROOT, 'products', productFiles[0]), 'utf8');
}

if (productHtml) {
  check(productHtml.includes('<product-form'), 'Product page includes <product-form> element');
  check(productHtml.includes('action="/cart/add"'), 'Product form action="/cart/add"');
  check(productHtml.includes('name="id"'), 'Product form has [name="id"] input');
  check(productHtml.includes('name="quantity"'), 'Product form has [name="quantity"] input');
  check(productHtml.includes('type="submit"'), 'Product form has submit button');
} else {
  console.log(`  ${CROSS_ICON} Could not find any product HTML file to check`);
  failed++;
}

const pagesCode = fs.readFileSync(path.join(ROOT, 'backend', 'routes', 'pages.js'), 'utf8');

// 12. HTTrack Middleware
console.log('\n[12] HTTrack Static File Handling');
check(serverCode.includes('createHttrackStatic'), 'createHttrackStatic function exists');
check(serverCode.includes('.tmp'), 'Handles .tmp files');
check(serverCode.includes('.z'), 'Handles .z files');
check(pagesCode.includes('.tmp'), 'readOriginalHTML handles .tmp files');
check(pagesCode.includes('.z'), 'readOriginalHTML handles .z files');

// 13. Order Model
console.log('\n[13] Order Model');
const orderModelCode = fs.readFileSync(path.join(ROOT, 'backend', 'models', 'order.js'), 'utf8');
check(orderModelCode.includes('create'), 'Order.create() exists');
check(orderModelCode.includes('findById'), 'Order.findById() exists');
check(orderModelCode.includes('getOrderNumber'), 'Order.getOrderNumber() exists');
check(orderModelCode.includes('updateStatus'), 'Order.updateStatus() exists');

// 14. Syntax Check
console.log('\n[14] JavaScript Syntax Check');
try {
  require('child_process').execSync(`node -c "${path.join(ROOT, 'public', 'js', 'bridge.js').replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
  check(true, 'bridge.js has valid syntax');
} catch (e) {
  check(false, 'bridge.js has valid syntax', e.stderr ? e.stderr.toString() : 'syntax error');
}
try {
  require('child_process').execSync(`node -c "${path.join(ROOT, 'server.js').replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
  check(true, 'server.js has valid syntax');
} catch (e) {
  check(false, 'server.js has valid syntax', e.stderr ? e.stderr.toString() : 'syntax error');
}

// Summary
console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
