const fs = require('fs');
const content = fs.readFileSync('products/5-tiền-3-sao-hoodie.html', 'utf8');

const idx = content.indexOf('MinimogProduct');
if (idx > -1) {
  console.log('MinimogProduct at', idx);
  console.log(content.substring(idx, idx + 300));
}

const vidx = content.indexOf('"variants"');
if (vidx > -1) {
  console.log('\n--- variants at', vidx);
  console.log(content.substring(vidx, vidx + 500));
}

const jidx = content.indexOf('"@type":"Product"');
if (jidx > -1) {
  console.log('\n--- JSON-LD at', jidx);
  console.log(content.substring(jidx, jidx + 500));
}
