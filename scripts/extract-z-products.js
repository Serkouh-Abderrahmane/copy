const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'luonvuituoi', password: '' });
  const [existing] = await c.query('SELECT slug FROM products');
  const dbSlugs = new Set(existing.map(p => p.slug));

  // Find all .z files that don't have a complete .html and aren't in DB
  const zFiles = fs.readdirSync('products').filter(f => f.endsWith('.html.z'));
  let extracted = 0;
  let addedToDb = 0;

  for (const zFile of zFiles) {
    const slug = zFile.replace(/\.html\.z$/, '');
    const htmlFile = path.join('products', slug + '.html');
    
    // Skip if already have complete file or already in DB
    if (fs.existsSync(htmlFile)) continue;
    if (dbSlugs.has(slug)) continue;

    try {
      const zData = fs.readFileSync(path.join('products', zFile));
      // Check if gzip
      if (zData[0] !== 0x1f || zData[1] !== 0x8b) continue;
      
      const html = zlib.gunzipSync(zData).toString('utf8');
      if (html.length < 1000) continue;

      // Save HTML file
      fs.writeFileSync(htmlFile, html);
      extracted++;

      // Extract product data
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (!titleMatch) continue;
      let name = titleMatch[1].replace(/&ndash;.*$/, '').replace(/–.*$/, '').trim();
      if (!name) name = slug;

      let price = 165000;
      const priceMatch = html.match(/<meta[^>]+property="og:price:amount"[^>]+content="([^"]+)"/);
      if (priceMatch) price = parseInt(priceMatch[1].replace(/[^\d]/g, ''));
      if (!price || price === 0) price = 165000;

      const images = [];
      const imgRegex = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/g;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        let img = match[1];
        img = img.replace(/^https?:\.\.\/\.\.\//, '/').replace(/^https?:\.\.\//, '/');
        img = img.replace(/^\.\.\/\.\.\//, '/').replace(/^\.\.\//, '/');
        if (!img.startsWith('/')) img = '/' + img;
        img = img.split('?')[0];
        if (!images.includes(img)) images.push(img);
      }

      let catId = 57;
      if (slug.includes('hoodie')) catId = 18;
      else if (slug.includes('sweater')) catId = 19;
      else if (slug.includes('ringer') || slug.includes('ba-l')) catId = 53;
      else if (slug.includes('tote') || slug.includes('canvas')) catId = 56;

      await c.query(
        'INSERT INTO products (name, slug, price, sale_price, images, category_id) VALUES (?, ?, ?, ?, ?, ?)',
        [name, slug, price, price, JSON.stringify(images), catId]
      );
      addedToDb++;
      dbSlugs.add(slug);

      console.log(`EXTRACTED ${slug}: ${name} - ${price}đ (cat=${catId})`);
    } catch (err) {
      console.log(`ERROR ${zFile}: ${err.message}`);
    }
  }

  console.log(`\nExtracted ${extracted} HTML files, added ${addedToDb} to DB`);
  await c.end();
})();
