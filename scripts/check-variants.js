const fs = require('fs');
const content = fs.readFileSync('products/5-ti\u1EC1n-3-sao-hoodie.html', 'utf8');

const re1 = /value="(\d+)"[^>]*data-selected-variant/g;
let m;
while ((m = re1.exec(content)) !== null) {
  console.log('Default variant id:', m[1]);
}

const re2 = /"id":(\d+)/g;
const allIds = [];
while ((m = re2.exec(content)) !== null) {
  allIds.push(m[1]);
}
const uniqueIds = [...new Set(allIds)];
console.log('All unique IDs found in page JSON:', uniqueIds.length);
console.log('Sample:', uniqueIds.slice(0, 20));

// Find variant-group-select elements
const re3 = /data-value="([^"]*)"[\s\S]*?data-variant-id="(\d+)"/g;
while ((m = re3.exec(content)) !== null) {
  console.log('Option variant:', m[1], '->', m[2]);
}

// Check for product JSON
const prodJsonMatch = content.match(/window\.MinimogProduct\s*=\s*(\{[\s\S]*?\});\s*</);
if (prodJsonMatch) {
  try {
    const prod = JSON.parse(prodJsonMatch[1]);
    if (prod.variants) {
      console.log('Product variants:');
      prod.variants.forEach(v => console.log('  Variant:', v.id, v.title, v.option1, v.option2));
    }
  } catch(e) {
    console.log('Failed to parse MinimogProduct:', e.message);
  }
}
