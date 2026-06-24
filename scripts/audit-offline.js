const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'luonvuituoi', password: '' });
  const [products] = await c.query('SELECT id, slug, name, images FROM products ORDER BY id');
  console.log('Total products:', products.length);

  const productsDir = path.join(__dirname, '..', 'products');
  const htmlFiles = fs.readdirSync(productsDir).filter(f => f.endsWith('.html'));
  const htmlSet = new Set(htmlFiles.map(f => f.toLowerCase()));

  let missingHtml = 0;
  let missingImages = 0;
  let totalImages = 0;
  const failures = [];

  for (const p of products) {
    // Check HTML file exists
    const expectedHtml = (p.slug + '.html').toLowerCase();
    if (!htmlSet.has(expectedHtml)) {
      missingHtml++;
      failures.push({ type: 'MISSING_HTML', id: p.id, slug: p.slug, name: p.name });
      continue;
    }

    // Check images
    let images = [];
    try { images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []); }
    catch (e) { images = []; }

    if (!images || images.length === 0) {
      missingImages++;
      failures.push({ type: 'NO_IMAGES', id: p.id, slug: p.slug, name: p.name });
      continue;
    }

    for (let j = 0; j < images.length; j++) {
      totalImages++;
      const img = images[j];
      if (!img) {
        missingImages++;
        failures.push({ type: 'EMPTY_IMAGE', id: p.id, slug: p.slug, name: p.name, detail: `image[${j}] is empty` });
        continue;
      }

      // Convert DB path to URL path (same as validate-products.js)
      let cleanPath = img
        .replace(/^https?:\.\.\/\.\.\//, '/')
        .replace(/^https?:\.\.\//, '/')
        .replace(/^\.\.\/\.\.\//, '/')
        .replace(/^\.\.\//, '/');
      if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
      cleanPath = cleanPath.split('?')[0];
      // The CDN middleware serves /cdn/* from the cdn/ directory
      // So /cdn/shop/files/foo.png maps to <project>/cdn/shop/files/foo.png
      const filePath = path.join(__dirname, '..', cleanPath.replace(/^\//, ''));
      if (fs.existsSync(filePath)) continue;

      // Try suffix match (4 extra chars)
      const dir = path.dirname(filePath);
      const base = path.basename(filePath);
      const ext = path.extname(base);
      const nameNoExt = base.slice(0, -ext.length);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        // Check for 4-char suffix: name+4hex+ext
        const suffixMatch = files.find(f =>
          f.startsWith(nameNoExt) &&
          f.length === base.length + 4 &&
          f.endsWith(ext)
        );
        if (suffixMatch) continue;

        // Check for prefix match (split by UUID)
        const prefix = nameNoExt.replace(/_[a-f0-9-]+$/i, '');
        if (prefix && prefix.length > 3) {
          const prefixMatch = files.find(f =>
            f.startsWith(prefix) && f.endsWith(ext)
          );
          if (prefixMatch) continue;
        }
      }

      missingImages++;
      failures.push({
        type: 'IMAGE_NOT_FOUND',
        id: p.id, slug: p.slug, name: p.name,
        detail: cleanPath
      });
    }
  }

  console.log('\n=== OFFLINE AUDIT REPORT ===\n');
  console.log('Products checked:', products.length);
  console.log('Total images in DB:', totalImages);
  console.log('Missing HTML files:', missingHtml);
  console.log('Missing images:', missingImages);

  if (failures.length > 0) {
    console.log('\n--- FAILURES ---');
    for (const f of failures) {
      console.log(`  ${f.type} | ID ${f.id} | ${f.slug}`);
      if (f.detail) console.log(`    Path: ${f.detail}`);
    }
  }

  if (missingHtml === 0 && missingImages === 0) {
    console.log('\nALL PASSED');
  } else {
    console.log(`\n${missingHtml} missing HTML, ${missingImages} missing images`);
  }

  await c.end();
})();
