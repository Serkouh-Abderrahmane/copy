const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

(async () => {
  try {
    await httpGet(BASE_URL);
  } catch (e) {
    console.log('ERROR: Server not running on ' + BASE_URL);
    process.exit(1);
  }

  console.log('Loading all products from API...');
  let resp;
  try {
    resp = await httpGet(BASE_URL + '/api/products?limit=500');
    const parsed = JSON.parse(resp.body);
    allProducts = parsed.products || parsed;
  } catch (e) {
    console.log('ERROR fetching products:', e.message);
    process.exit(1);
  }
  console.log(`Total products in DB: ${allProducts.length}\n`);

  let routeFailures = 0;
  let imageFailures = 0;
  const failures = [];
  let totalImages = 0;

  for (let i = 0; i < allProducts.length; i++) {
    const product = allProducts[i];
    const slug = product.slug;
    let images = [];
    try {
      images = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
    } catch (e) { images = []; }

    // Test product route
    let routeStatus = null;
    try {
      resp = await httpGet(`${BASE_URL}/products/${encodeURIComponent(slug)}`);
      routeStatus = resp.status;
    } catch (e) { routeStatus = 'ERROR'; }

    if (routeStatus !== 200) {
      routeFailures++;
      failures.push({ id: product.id, slug, name: product.name, issue: 'ROUTE', detail: `Status ${routeStatus}` });
    }

    // Test each image via HTTP (CDN handles HTTrack filename mangling)
    for (let j = 0; j < images.length; j++) {
      totalImages++;
      const img = images[j];
      if (!img) {
        imageFailures++;
        failures.push({ id: product.id, slug, name: product.name, issue: 'IMAGE_EMPTY', detail: `image[${j}] is empty` });
        continue;
      }
      // Clean path
      let cleanPath = img.replace(/^https?:\.\.\/\.\.\//, '/').replace(/^https?:\.\.\//, '/');
      cleanPath = cleanPath.replace(/^\.\.\/\.\.\//, '/').replace(/^\.\.\//, '/');
      if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
      cleanPath = cleanPath.split('?')[0].split('&')[0];

      let imgStatus;
      try {
        resp = await httpGet(BASE_URL + cleanPath);
        imgStatus = resp.status;
      } catch (e) { imgStatus = 'ERROR'; }

      if (imgStatus !== 200) {
        imageFailures++;
        failures.push({ id: product.id, slug, name: product.name, issue: 'IMAGE_BROKEN', detail: `${cleanPath} => ${imgStatus}` });
      }
    }
  }

  // Report
  console.log('=== VALIDATION REPORT ===\n');
  console.log(`Total products: ${allProducts.length}`);
  console.log(`Total images: ${totalImages}`);
  console.log(`Route failures: ${routeFailures}`);
  console.log(`Image failures: ${imageFailures}\n`);

  if (failures.length > 0) {
    console.log('--- FAILURES ---');
    for (const f of failures) {
      console.log(`  ${f.issue} | ID ${f.id} | ${f.slug} | ${f.name.substring(0, 40)}`);
      console.log(`    ${f.detail}`);
    }
    console.log();
  }

  console.log('=== END REPORT ===');
  if (routeFailures === 0 && imageFailures === 0) {
    console.log('ALL PASSED');
  } else {
    console.log(`${routeFailures} route failures, ${imageFailures} image failures`);
  }
})();
