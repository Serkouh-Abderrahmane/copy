const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'luonvuituoi', password: '' });
  const [dbProducts] = await c.query('SELECT id, slug FROM products');
  const dbSlugs = new Set(dbProducts.map(p => p.slug));

  const htmlFiles = [];
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!full.includes('node_modules') && !full.includes('.git') && !full.includes('admin') && !full.includes('views')) {
          scan(full);
        }
      } else if (e.name.endsWith('.html') && !e.name.endsWith('.tmp') && !e.name.endsWith('.z') && !e.name.endsWith('.oembed')) {
        htmlFiles.push(full);
      }
    }
  }
  scan('.');

  console.log('Checking ' + htmlFiles.length + ' HTML files for product links...\n');

  const linkRE = /href=["'](?:\.\.\/)?products\/([^"']+?)(?:\.html)?["']/gi;
  const handleRE = /data-product-handle=["']([^"']+?)["']/gi;
  const foundLinks = new Map();

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = linkRE.exec(content)) !== null) {
      const slug = decodeURIComponent(match[1]).replace(/\.html$/i, '');
      if (!foundLinks.has(slug)) foundLinks.set(slug, []);
      foundLinks.get(slug).push(file.replace(/\\/g, '/'));
    }
    while ((match = handleRE.exec(content)) !== null) {
      const slug = match[1];
      if (!foundLinks.has(slug)) foundLinks.set(slug, []);
      foundLinks.get(slug).push(file.replace(/\\/g, '/') + ' (handle)');
    }
  }

  console.log('=== BROKEN PRODUCT LINKS (not in DB, no HTML file) ===');
  let brokenCount = 0;
  const brokenSlugs = [];
  for (const [slug, sources] of foundLinks) {
    const inDb = dbSlugs.has(slug);
    const htmlFile = path.join('products', slug + '.html');
    const hasFile = fs.existsSync(htmlFile);
    if (!inDb && !hasFile) {
      brokenCount++;
      brokenSlugs.push(slug);
      const hasTmp = fs.existsSync(path.join('products', slug + '.html.tmp'));
      const hasZ = fs.existsSync(path.join('products', slug + '.html.z'));
      const partial = hasTmp || hasZ ? '(partial download)' : '(NO FILE)';
      console.log('  ' + slug + ' ' + partial);
      console.log('    Sources: ' + sources.slice(0, 3).join(', '));
    }
  }
  console.log('\nTotal broken links: ' + brokenCount);

  // Check for links that have HTML files but no DB entry
  console.log('\n=== Products with HTML files but NOT in DB ===');
  const allFiles = fs.readdirSync('products').filter(f => f.endsWith('.html') && !f.endsWith('.tmp') && !f.endsWith('.z') && !f.endsWith('.oembed'));
  const diskOnly = [];
  for (const file of allFiles) {
    const slug = file.replace(/\.html$/i, '');
    if (!dbSlugs.has(slug)) {
      diskOnly.push(slug);
      console.log('  ' + slug);
    }
  }

  // Check for DB products with no HTML file
  console.log('\n=== Products in DB but NO HTML file on disk ===');
  for (const p of dbProducts) {
    const htmlFile = path.join('products', p.slug + '.html');
    if (!fs.existsSync(htmlFile)) {
      console.log('  ' + p.slug + ' (id=' + p.id + ')');
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('DB products: ' + dbProducts.length);
  console.log('HTML files on disk: ' + allFiles.length);
  console.log('Broken links (no DB, no file): ' + brokenCount);
  console.log('Files on disk but no DB: ' + diskOnly.length);

  await c.end();
})();
