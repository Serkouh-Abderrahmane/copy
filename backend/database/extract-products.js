const fs = require('fs');
const path = require('path');
const pool = require('./db');
const slugify = require('slugify');

const PRODUCTS_DIR = path.join(__dirname, '..', '..', 'products');
const COLLECTIONS_DIR = path.join(__dirname, '..', '..', 'collections');

function extractProductData(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const data = {};

  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) data.name = titleMatch[1].replace(/\s*[–-]\s*Luon Vuituoi\s*$/, '').trim();

  const priceMatch = html.match(/<meta property="og:price:amount" content="([^"]+)"/);
  if (priceMatch) data.price = parseInt(priceMatch[1].replace(/\./g, ''));

  const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
  if (descMatch) data.description = descMatch[1];

  const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (imgMatch) data.images = [imgMatch[1]];

  const handleMatch = html.match(/data-product-handle="([^"]+)"/);
  if (handleMatch) data.slug = handleMatch[1];

  const skuMatch = html.match(/data-product-id="([^"]+)"/);
  if (skuMatch) data.sku = `SP-${skuMatch[1]}`;

  if (!data.slug && data.name) {
    data.slug = slugify(data.name, { lower: true, strict: true });
  }

  if (data.price) {
    data.sale_price = data.price;
  }

  return data;
}

function extractCollectionName(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    return titleMatch[1].replace(/\s*[–-]\s*Luon Vuituoi\s*$/, '').trim();
  }
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1Match) return h1Match[1].trim();
  return null;
}

async function run() {
  try {
    console.log('Extracting products...');
    const productFiles = fs.readdirSync(PRODUCTS_DIR)
      .filter(f => f.endsWith('.html') && !f.match(/\.[a-f0-9]{4}\.html$/) && !f.includes('.tmp'))
      .slice(0, 100);

    let count = 0;
    for (const file of productFiles) {
      try {
        const data = extractProductData(path.join(PRODUCTS_DIR, file));
        if (data.name && data.price) {
          const [existing] = await pool.query('SELECT id FROM products WHERE slug = ?', [data.slug]);
          if (existing.length === 0) {
            await pool.query(
              'INSERT INTO products (name, slug, description, short_description, price, sale_price, sku, stock, images, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [data.name, data.slug, data.description || '', '', data.price, data.sale_price || data.price, data.sku || null, 10, JSON.stringify(data.images || []), 'active']
            );
            count++;
            console.log(`  Added: ${data.name}`);
          }
        }
      } catch (err) {
        console.error(`  Error processing ${file}: ${err.message}`);
      }
    }
    console.log(`\nAdded ${count} products`);

    console.log('\nExtracting collections/categories...');
    const collectionFiles = fs.readdirSync(COLLECTIONS_DIR)
      .filter(f => f.endsWith('.html') && !f.match(/\.[a-f0-9]{4}\.html$/) && f !== 'all.html');

    let catCount = 0;
    for (const file of collectionFiles) {
      try {
        const name = extractCollectionName(path.join(COLLECTIONS_DIR, file));
        if (name && !name.includes('?')) {
          const slug = path.parse(file).name;
          const [existing] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug]);
          if (existing.length === 0) {
            await pool.query(
              'INSERT INTO categories (name, slug, status) VALUES (?, ?, ?)',
              [name, slug, 'active']
            );
            catCount++;
            console.log(`  Added category: ${name}`);
          }
        }
      } catch (err) {
        console.error(`  Error processing ${file}: ${err.message}`);
      }
    }
    console.log(`\nAdded ${catCount} categories`);
    console.log('\nExtraction complete!');
    process.exit(0);
  } catch (err) {
    console.error('Extraction failed:', err);
    process.exit(1);
  }
}

run();
