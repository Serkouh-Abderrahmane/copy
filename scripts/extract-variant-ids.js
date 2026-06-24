const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'luonvuituoi', password: '' });
  const [rows] = await c.query('SELECT id, slug FROM products ORDER BY id');
  console.log('Total products in DB:', rows.length);

  await c.query(`CREATE TABLE IF NOT EXISTS shopify_variants (
    id bigint(20) NOT NULL PRIMARY KEY,
    product_id int(11) NOT NULL,
    KEY product_id (product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('Table shopify_variants ready');

  const productsDir = path.join(__dirname, '..', 'products');
  const htmlFiles = fs.readdirSync(productsDir).filter(f => f.endsWith('.html'));
  console.log('HTML files found:', htmlFiles.length);

  let processed = 0, found = 0, skipped = 0;

  for (const p of rows) {
    const expectedName = p.slug + '.html';
    let htmlFile = htmlFiles.find(f => f.toLowerCase() === expectedName.toLowerCase());
    if (!htmlFile) {
      skipped++;
      continue;
    }
    processed++;
    const content = fs.readFileSync(path.join(productsDir, htmlFile), 'utf8');

    // Extract variant IDs from the "variants":[{"id":"12345",...}] JSON in the HTML
    const variantIds = new Set();

    // Method 1: Find "variants":[{...}] JSON array
    const vstart = content.indexOf('"variants":[');
    if (vstart > -1) {
      let depth = 0;
      let pos = vstart + 12;
      let inStr = false, esc = false;
      while (pos < content.length) {
        const ch = content[pos];
        if (esc) { esc = false; pos++; continue; }
        if (ch === '\\' && inStr) { esc = true; pos++; continue; }
        if (ch === '"') { inStr = !inStr; pos++; continue; }
        if (!inStr) {
          if (ch === '[') depth++;
          if (ch === ']') { depth--; if (depth === 0) break; }
        }
        pos++;
      }
      const variantsJson = content.substring(vstart + 11, pos + 1);
      try {
        const variants = JSON.parse(variantsJson);
        for (const v of variants) {
          if (v.id) variantIds.add(String(v.id));
        }
      } catch (e) {
        // Fallback: regex extract all "id":"digits" from the variants section
        const idRegex = /"id":"?(\d+)"?/g;
        let m;
        while ((m = idRegex.exec(variantsJson)) !== null) {
          variantIds.add(m[1]);
        }
      }
    }

    // Method 2: Extract from hidden name="id" inputs
    const inputRegex = /<input[^>]*name="id"[^>]*value="(\d+)"/g;
    let match;
    while ((match = inputRegex.exec(content)) !== null) {
      variantIds.add(match[1]);
    }

    if (variantIds.size > 0) {
      for (const vid of variantIds) {
        try {
          await c.query('INSERT IGNORE INTO shopify_variants (id, product_id) VALUES (?, ?)', [vid, p.id]);
          found++;
        } catch (e) { console.error('Insert error for', vid, p.id, e.message); }
      }
    }
  }

  console.log('Processed products:', processed, 'skipped:', skipped, 'variant mappings created:', found);
  const [cnt] = await c.query('SELECT COUNT(*) as cnt FROM shopify_variants');
  console.log('Total variant mappings in DB:', cnt[0].cnt);

  const [sample] = await c.query('SELECT sv.id, sv.product_id, p.slug FROM shopify_variants sv JOIN products p ON sv.product_id = p.id LIMIT 10');
  console.log('Sample mappings:', JSON.stringify(sample, null, 2));

  await c.end();
})();
