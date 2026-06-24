const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'luonvuituoi', password: '' });
  const [products] = await c.query('SELECT id, slug, name, images FROM products ORDER BY id');
  console.log('Total products:', products.length);

  // Fix all image paths: strip domains, normalize to /cdn/...
  let fixed = 0;
  for (const p of products) {
    let images = [];
    try { images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []); }
    catch (e) { continue; }
    let changed = false;
    const cleaned = images.map(img => {
      if (!img) return img;
      let c = img
        // Strip http://luonvuituoi.co
        .replace(/https?:\/\/luonvuituoi\.co/g, '')
        // Strip http:../
        .replace(/^https?:\.\.\/\.\.\//, '/')
        .replace(/^https?:\.\.\//, '/')
        // Strip ../
        .replace(/^\.\.\/\.\.\//, '/')
        .replace(/^\.\.\//, '/')
        // Remove leading double slash
        .replace(/^\/\//, '/');
      // Ensure starts with /
      if (c && !c.startsWith('/')) c = '/' + c;
      // Remove query params
      c = c.split('?')[0];
      if (c !== img) changed = true;
      return c;
    });
    if (changed) {
      await c.query('UPDATE products SET images = ? WHERE id = ?', [JSON.stringify(cleaned), p.id]);
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} products with cleaned image paths.`);

  // Now verify files exist on disk
  const productsDir = path.join(__dirname, '..', 'products');
  const htmlFiles = fs.readdirSync(productsDir).filter(f => f.endsWith('.html'));
  const htmlSet = new Set(htmlFiles.map(f => f.toLowerCase()));
  const [updated] = await c.query('SELECT id, slug, name, images FROM products ORDER BY id');

  let missingHtml = 0, totalImages = 0, foundImages = 0, missingImages = 0;

  for (const p of updated) {
    const slugLower = (p.slug + '.html').toLowerCase();
    if (!htmlSet.has(slugLower)) { missingHtml++; continue; }

    let images = [];
    try { images = JSON.parse(p.images); } catch (e) { continue; }
    for (const img of images) {
      if (!img) { missingImages++; continue; }
      totalImages++;
      const filePath = path.join(__dirname, '..', img.replace(/^\//, ''));
      if (fs.existsSync(filePath)) { foundImages++; continue; }
      const dir = path.dirname(filePath);
      const base = path.basename(filePath);
      const ext = path.extname(base);
      const nameNoExt = base.slice(0, -ext.length);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => !f.endsWith('.tmp'));
        const suffix = files.find(f => f.startsWith(nameNoExt) && f.length === base.length + 4 && f.endsWith(ext));
        if (suffix) { foundImages++; continue; }
        const prefix = nameNoExt.replace(/_[a-f0-9-]+$/i, '');
        if (prefix && prefix.length > 3) {
          if (files.find(f => f.startsWith(prefix) && f.endsWith(ext))) { foundImages++; continue; }
        }
      }
      missingImages++;
      console.log(`MISSING | ${p.slug} | ${img}`);
    }
  }

  const productsWithImages = updated.filter(p => {
    try { const i = JSON.parse(p.images); return i && i.length > 0 && i[0]; } catch { return false; }
  }).length;

  console.log(`\nProducts: ${updated.length}, With images: ${productsWithImages}, Missing HTML: ${missingHtml}`);
  console.log(`Images: ${totalImages} total, ${foundImages} found on disk, ${missingImages} missing`);
  console.log(`Image success rate: ${totalImages > 0 ? Math.round(foundImages / totalImages * 100) : 0}%`);

  await c.end();
})();
