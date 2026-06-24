const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function extractFromHtml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) return null;
  let name = titleMatch[1].replace(/&ndash;.*$/, '').replace(/–.*$/, '').trim();
  if (!name) return null;
  
  // Extract price from meta og:price:amount
  let price = null;
  const priceMatch = content.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/);
  if (priceMatch) {
    price = parseInt(priceMatch[1].replace(/[^\d]/g, ''));
  }
  if (!price) {
    // Try to find price in JSON-LD or inline script
    const jsonLdMatch = content.match(/"price":\s*["']?([\d,.]+)["']?/);
    if (jsonLdMatch) price = parseInt(jsonLdMatch[1].replace(/[^\d]/g, ''));
  }
  if (!price) price = 0;
  
  // Extract images
  const images = [];
  const imgRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/g;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    let img = match[1];
    // Clean up HTTrack path: http:../../cdn/ -> /cdn/
    img = img.replace(/^https?:\.\.\/\.\.\//, '/').replace(/^https?:\.\.\//, '/');
    img = img.replace(/^\.\.\/\.\.\//, '/').replace(/^\.\.\//, '/');
    // Ensure leading /
    if (!img.startsWith('/')) img = '/' + img;
    // Remove query params for storage, keep path
    img = img.split('?')[0];
    if (!images.includes(img)) images.push(img);
  }
  
  // Also check for product images in the HTML
  const productImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*class=["'][^"']*product__media[^"']*["']/g;
  while ((match = productImgRegex.exec(content)) !== null) {
    let img = match[1];
    img = img.replace(/^https?:\.\.\/\.\.\//, '/').replace(/^https?:\.\.\//, '/');
    img = img.replace(/^\.\.\/\.\.\//, '/').replace(/^\.\.\//, '/');
    if (!img.startsWith('/')) img = '/' + img;
    img = img.split('?')[0];
    img = img.split('&')[0];
    if (!images.includes(img)) images.push(img);
  }
  
  return { name, price, images };
}

(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'luonvuituoi', password: '' });
  
  // Get existing DB slugs
  const [dbProducts] = await c.query('SELECT id, slug FROM products');
  const dbSlugs = new Set(dbProducts.map(p => p.slug));
  
  // Find HTML files not in DB
  const allFiles = fs.readdirSync('products').filter(f => 
    f.endsWith('.html') && !f.endsWith('.tmp') && !f.endsWith('.z') && !f.endsWith('.oembed')
  );
  
  const toImport = [];
  for (const file of allFiles) {
    const slug = file.replace(/\.html$/i, '');
    if (!dbSlugs.has(slug)) {
      toImport.push({ slug, filePath: path.join('products', file) });
    }
  }
  
  console.log(`Found ${toImport.length} products to import (files on disk but no DB entry)`);
  
  let imported = 0;
  let errors = 0;
  
  for (const item of toImport) {
    try {
      const data = await extractFromHtml(item.filePath);
      if (!data || !data.name) {
        console.log(`  SKIP ${item.slug}: could not extract name`);
        errors++;
        continue;
      }
      
      // Check if slug already exists (race condition)
      const [existing] = await c.query('SELECT id FROM products WHERE slug = ?', [item.slug]);
      if (existing.length > 0) {
        console.log(`  SKIP ${item.slug}: already in DB`);
        continue;
      }
      
      const images = JSON.stringify(data.images);
      await c.query(
        'INSERT INTO products (name, slug, price, sale_price, images, category_id) VALUES (?, ?, ?, ?, ?, ?)',
        [data.name, item.slug, data.price, data.price, images, 57] // default to category 57 (t-shirts)
      );
      imported++;
      
      if (imported <= 5 || imported % 50 === 0) {
        console.log(`  IMPORT ${item.slug}: ${data.name} - ${data.price}đ - ${data.images.length} images`);
      }
    } catch (err) {
      console.log(`  ERROR ${item.slug}: ${err.message}`);
      errors++;
    }
  }
  
  // Categorize based on slug patterns
  console.log(`\nCategorizing products...`);
  
  // Update categories based on slug patterns
  const [allProducts] = await c.query('SELECT id, slug FROM products WHERE category_id = 57');
  let catUpdates = 0;
  for (const p of allProducts) {
    let catId = 57; // default: t-shirts
    
    if (p.slug.includes('hoodie') || p.slug.includes('hoodie')) catId = 18;
    else if (p.slug.includes('sweater')) catId = 19;
    else if (p.slug.includes('ringer')) catId = 53;
    else if (p.slug.includes('ba-lỗ') || p.slug.includes('ba-lo')) catId = 53; // ba lỗ kinda like ringer in this store
    else if (p.slug.includes('tote')) catId = 56;
    else if (p.slug.includes('canvas')) catId = 56;
    else if (p.slug.includes('jogger') || p.slug.includes('quần')) catId = 54;
    
    if (catId !== 57) {
      await c.query('UPDATE products SET category_id = ? WHERE id = ?', [catId, p.id]);
      catUpdates++;
    }
  }
  
  const [finalCount] = await c.query('SELECT COUNT(*) as cnt FROM products');
  console.log(`\n=== IMPORT SUMMARY ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Errors: ${errors}`);
  console.log(`Categories updated: ${catUpdates}`);
  console.log(`Total DB products now: ${finalCount[0].cnt}`);
  
  await c.end();
})();
